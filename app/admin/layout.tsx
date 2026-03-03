import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar user={session.user} />
      <div className="md:pl-60">
        <div className="pl-14 md:pl-0 px-3 py-2 bg-[#004D3E]/5 border-b border-[#004D3E]/10">
          <p className="text-xs text-[#004D3E] font-medium md:pl-5">Admin Panel</p>
        </div>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
