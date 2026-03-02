'use client';

import { signOut } from 'next-auth/react';
import { LayoutDashboard, Phone, LogOut, Users, Megaphone, Receipt, History } from 'lucide-react';
import { Sidebar, type SidebarNavItem } from '@/components/layout/sidebar';

const navItems: SidebarNavItem[] = [
  { label: 'Dashboard',    href: '/dashboard', icon: LayoutDashboard },
  { label: 'Contacts',     href: '/contacts',  icon: Users },
  { label: 'Campaigns',    href: '/campaigns', icon: Megaphone },
  { label: 'Call History', href: '/calls',     icon: Phone },
  {
    label: 'Billing',
    icon:  Receipt,
    children: [
      { label: 'Current Bill',     href: '/billing',         icon: Receipt },
      { label: 'Invoice History',  href: '/billing/history', icon: History },
    ],
  },
];

interface User {
  name?:  string | null;
  email:  string;
  image?: string | null;
}

export function DashboardSidebar({ user }: { user: User }) {
  return (
    <Sidebar
      items={navItems}
      userSection={
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name || 'User'}</p>
              <p className="text-green-200/70 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2 text-green-100/80 hover:bg-white/10 hover:text-white rounded-lg text-sm transition"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      }
    />
  );
}
