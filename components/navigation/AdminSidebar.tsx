'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useSidebar } from '../SidebarContext';
import { useAuth } from '../AuthProvider';

const adminNav = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Services', href: '/admin/services', icon: Layers },
  { label: 'Users & roles', href: '/admin/users', icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { signOut } = useAuth();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen border-r border-amber-500/25 bg-slate-950 text-slate-100 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className={`flex h-16 items-center border-b border-white/10 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Image src="/superwork-icon-white.svg" alt="Superwork" width={32} height={32} priority />
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                  Admin
                </span>
                <Image src="/superwork-logo-white.svg" alt="Superwork" width={120} height={24} priority />
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active ? 'bg-amber-500/15 text-amber-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <Link
            href="/team"
            className={`mb-2 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white`}
            title={isCollapsed ? 'Exit admin' : undefined}
          >
            {!isCollapsed && <span>← Team / portal</span>}
            {isCollapsed && <span className="text-xs">←</span>}
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push('/login');
              router.refresh();
            }}
            className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white`}
            title={isCollapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
