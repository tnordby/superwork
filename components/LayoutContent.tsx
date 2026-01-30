'use client';

import { useSidebar } from './SidebarContext';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <main className={`mt-16 min-h-screen bg-white transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
      {children}
    </main>
  );
}
