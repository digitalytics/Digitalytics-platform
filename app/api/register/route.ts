import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { UserStatus, Role } from '@prisma/client';
import { generateOtp, hashOtp } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.USER,
        status: UserStatus.PENDING,
        emailVerificationToken: otpHash,
        emailVerificationExpiry: expiry,
      },
    });

    // Send email — best effort. If it fails the user can resend from /verify-email
    try {
      await sendVerificationEmail(email, otp, name);
    } catch (emailErr) {
      console.error('[register] Failed to send verification email:', emailErr);
    }

    return NextResponse.json(
      { message: 'Account created. Please verify your email.' },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
