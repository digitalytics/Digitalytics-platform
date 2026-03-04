'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { fadeInUp, staggerContainer } from '@/lib/animations';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    // Always show success (prevent user enumeration)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    });
    setSubmittedEmail(data.email);
    setSent(true);
  };

  if (sent) {
    return (
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#004D3E]/10 rounded-full mb-4">
            <Mail className="w-7 h-7 text-[#004D3E]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 mb-6">
            If an account exists for <span className="font-medium text-gray-800">{submittedEmail}</span>, you&apos;ll receive a 6-digit reset code shortly.
          </p>
          <button
            onClick={() =>
              router.push(`/reset-password?email=${encodeURIComponent(submittedEmail)}`)
            }
            className="w-full bg-[#004D3E] hover:bg-[#0a5f4a] text-white font-medium py-2.5 rounded-lg transition mb-3"
          >
            Enter code
          </button>
          <Link href="/login" className="block text-sm text-gray-500 hover:underline">
            Back to sign in
          </Link>
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
        <h1 className="text-3xl font-bold text-white">Forgot password?</h1>
        <p className="text-green-200 mt-1">Enter your email and we&apos;ll send you a reset code</p>
      </motion.div>

      <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-2xl p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004D3E] focus:border-transparent transition"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[#004D3E] hover:bg-[#0a5f4a] text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Send reset code
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Remember your password?{' '}
          <Link href="/login" className="text-[#004D3E] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
