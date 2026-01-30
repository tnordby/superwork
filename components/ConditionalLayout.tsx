'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './navigation/Sidebar';
import { Header } from './Header';
import { LayoutContent } from './LayoutContent';
import { SidebarProvider } from './SidebarContext';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Routes that should not show sidebar/header
  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  if (isAuthRoute) {
    // Auth pages - no sidebar, no header, just the content
    return <>{children}</>;
  }

  // Regular pages - show sidebar and header
  return (
    <SidebarProvider>
      <Sidebar />
      <Header />
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
