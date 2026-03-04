import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateOtp, hashOtp } from '@/lib/otp';
import { sendPasswordResetEmail } from '@/lib/email';

const schema = z.object({
  email: z.string().email(),
});

const SUCCESS_RESPONSE = { message: 'If an account exists with that email, a reset code has been sent.' };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(SUCCESS_RESPONSE); // always 200
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Silently skip if user not found or is OAuth-only (no passwordHash)
    if (!user || !user.passwordHash) {
      return NextResponse.json(SUCCESS_RESPONSE);
    }

    // Rate limit: if expiry is > 14 minutes away, code was sent < 1 minute ago
    if (user.passwordResetExpiry) {
      const fourteenMinutesFromNow = new Date(Date.now() + 14 * 60 * 1000);
      if (user.passwordResetExpiry > fourteenMinutesFromNow) {
        return NextResponse.json(SUCCESS_RESPONSE); // silently ignore rate limit to prevent enumeration
      }
    }

    const otp = generateOtp();
    const hash = await hashOtp(otp);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: hash,
        passwordResetExpiry: expiry,
      },
    });

    try {
      await sendPasswordResetEmail(email, otp, user.name ?? 'there');
    } catch (emailErr) {
      console.error('[forgot-password] Failed to send email:', emailErr);
    }

    return NextResponse.json(SUCCESS_RESPONSE);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
