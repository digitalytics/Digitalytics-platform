import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { email, code } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Already verified — idempotent
    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email already verified' });
    }

    if (!user.emailVerificationToken || !user.emailVerificationExpiry) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (new Date() > user.emailVerificationExpiry) {
      return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 });
    }

    const valid = await verifyOtp(code, user.emailVerificationToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return NextResponse.json({ message: 'Email verified successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
