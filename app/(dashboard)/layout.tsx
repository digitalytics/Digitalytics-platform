import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { NotificationBell } from '@/components/ui/notification-bell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.status !== 'ACTIVE') redirect('/pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar user={session.user} />
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pl-14 pr-4 md:px-8 py-3 flex items-center justify-end">
          <NotificationBell />
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
