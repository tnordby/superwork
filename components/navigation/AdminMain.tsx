'use client';

import { useSidebar } from '../SidebarContext';

export function AdminMain({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={`flex min-h-screen flex-1 flex-col bg-slate-100 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">Admin</span>
        <span className="ml-3 text-sm text-slate-600">Platform console</span>
      </header>
      <div className="flex-1 overflow-auto p-6 sm:p-8">{children}</div>
    </div>
  );
}
