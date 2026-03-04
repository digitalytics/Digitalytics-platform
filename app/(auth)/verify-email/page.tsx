'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { InputOtp } from '@/components/ui/input-otp';
import { fadeInUp, staggerContainer } from '@/lib/animations';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!email) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10 text-center">
        <p className="text-gray-500">Invalid link. Please register again.</p>
        <Link href="/register" className="mt-4 inline-block text-[#004D3E] font-medium hover:underline">
          Back to Register
        </Link>
      </div>
    );
  }

  const handleVerify = async (codeStr?: string) => {
    const finalCode = codeStr ?? code.join('');
    if (finalCode.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: finalCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Verification failed');
      } else {
        setSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.status === 429) {
        setError(json.error ?? 'Please wait before requesting another code.');
      } else if (!res.ok) {
        setError(json.error ?? 'Failed to resend. Please try again.');
      } else {
        setCooldown(60);
        setCode(Array(6).fill(''));
      }
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
          <p className="text-gray-500 mb-2">Your email has been verified successfully.</p>
          <p className="text-gray-500 mb-6">
            Your account is now pending admin approval. You&apos;ll receive access once an admin reviews your request.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#004D3E] hover:bg-[#0a5f4a] text-white font-medium py-2.5 rounded-lg transition"
          >
            Back to Sign In
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-md"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeInUp} className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Check your email</h1>
        <p className="text-green-200 mt-1">
          We sent a 6-digit code to <span className="font-medium text-white">{email}</span>
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-2xl p-8">
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <InputOtp
            value={code}
            onChange={setCode}
            onComplete={handleVerify}
            disabled={isLoading}
            hasError={!!error}
          />
        </div>

        <button
          onClick={() => handleVerify()}
          disabled={isLoading || code.join('').length < 6}
          className="w-full flex items-center justify-center gap-2 bg-[#004D3E] hover:bg-[#0a5f4a] text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          Verify Email
        </button>

        <div className="mt-5 text-center text-sm text-gray-500">
          Didn&apos;t receive the code?{' '}
          {cooldown > 0 ? (
            <span className="text-gray-400">Resend in {cooldown}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-[#004D3E] font-medium hover:underline disabled:opacity-60"
            >
              {isResending ? 'Sending...' : 'Resend code'}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          <Link href="/login" className="hover:underline">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
