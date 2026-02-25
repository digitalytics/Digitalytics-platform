import { auth } from '@/lib/auth';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

export default async function PendingPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#004D3E] via-[#0a5f4a] to-[#166534] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h1>
        <p className="text-gray-500 mb-2">
          Hi <span className="font-medium text-gray-700">{session?.user?.name || 'there'}</span>,
        </p>
        <p className="text-gray-500 mb-6">
          Your account is awaiting approval from an administrator. You&apos;ll receive access
          once your request has been reviewed.
        </p>
        <Link
          href="/api/auth/signout"
          className="inline-block w-full bg-[#004D3E] hover:bg-[#0a5f4a] text-white font-medium py-2.5 rounded-lg transition text-center"
        >
          Sign Out
        </Link>
      </div>
    </div>
  );
}
