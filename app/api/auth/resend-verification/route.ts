import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateOtp, hashOtp } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/email';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal user existence
      return NextResponse.json({ message: 'Verification email sent if account exists' });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email already verified' });
    }

    // Rate limit: if expiry is > 9 minutes away, code was sent < 1 minute ago
    if (user.emailVerificationExpiry) {
      const nineMinutesFromNow = new Date(Date.now() + 9 * 60 * 1000);
      if (user.emailVerificationExpiry > nineMinutesFromNow) {
        return NextResponse.json(
          { error: 'Please wait before requesting another code.' },
          { status: 429 }
        );
      }
    }

    const otp = generateOtp();
    const hash = await hashOtp(otp);
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { email },
      data: {
        emailVerificationToken: hash,
        emailVerificationExpiry: expiry,
      },
    });

    try {
      await sendVerificationEmail(email, otp, user.name ?? 'there');
    } catch (emailErr) {
      console.error('[resend-verification] Failed to send email:', emailErr);
    }

    return NextResponse.json({ message: 'Verification email sent' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
