'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href:  string;
  icon:  LucideIcon;
}

export interface NavGroup {
  label:    string;
  icon:     LucideIcon;
  children: NavItem[];
}

export type SidebarNavItem = NavItem | NavGroup;

function isNavGroup(item: SidebarNavItem): item is NavGroup {
  return 'children' in item;
}

interface SidebarProps {
  items:       SidebarNavItem[];
  userSection?: React.ReactNode;
}

function NavGroupItem({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const isAnyChildActive = group.children.some(c => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isAnyChildActive
            ? 'bg-white/15 text-white'
            : 'text-green-100/80 hover:bg-white/10 hover:text-white'
        )}
      >
        <group.icon size={18} className="flex-shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-200 flex-shrink-0', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mt-0.5 ml-3 pl-4 border-l border-white/15 space-y-0.5">
          {group.children.map(child => {
            const isActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-green-100/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <child.icon size={16} />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ items, userSection }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-[#004D3E] text-white md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-60 bg-[#004D3E] flex-col z-50',
          mobileOpen ? 'flex' : 'hidden md:flex'
        )}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <span className="text-white font-semibold text-lg">Digiweb</span>
            </div>
            <button
              className="md:hidden text-white/60 hover:text-white p-1 rounded transition-colors"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {items.map((item, i) => {
            if (isNavGroup(item)) {
              return <NavGroupItem key={i} group={item} />;
            }

            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-green-100/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {userSection && (
          <div className="px-3 py-4 border-t border-white/10">{userSection}</div>
        )}
      </aside>
    </>
  );
}
