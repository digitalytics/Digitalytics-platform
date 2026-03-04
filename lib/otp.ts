import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export function generateOtp(): string {
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(6, '0');
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
