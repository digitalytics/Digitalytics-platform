'use client';

import { signOut } from 'next-auth/react';
import { LayoutDashboard, Users, Bot, BarChart3, LogOut, Receipt } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';

const adminNavItems = [
  { label: 'Overview',  href: '/admin',           icon: LayoutDashboard },
  { label: 'Users',     href: '/admin/users',      icon: Users },
  { label: 'Agents',    href: '/admin/agents',     icon: Bot },
  { label: 'Analytics', href: '/admin/analytics',  icon: BarChart3 },
  { label: 'Billing',   href: '/admin/billing',    icon: Receipt },
];

interface User {
  name?: string | null;
  email: string;
  image?: string | null;
}

export function AdminSidebar({ user }: { user: User }) {
  return (
    <Sidebar
      items={adminNavItems}
      userSection={
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name || 'Admin'}</p>
              <p className="text-green-200/60 text-xs">Administrator</p>
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
