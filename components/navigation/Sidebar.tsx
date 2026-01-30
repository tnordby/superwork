'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '../SidebarContext';
import { useAuth } from '../AuthProvider';
import {
  Home,
  Wallet,
  CreditCard,
  BarChart3,
  Layers,
  FileText,
  Users,
  FolderTree,
  Settings,
  Folder,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Briefcase,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Inbox,
  Grid3x3,
  FolderKanban,
  Shield,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ExpandableNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems: NavItem[];
}

const navigationItems: (NavItem | ExpandableNavItem)[] = [
  {
    label: 'Home',
    href: '/',
    icon: Home,
  },
  {
    label: 'Projects',
    icon: Briefcase,
    subItems: [
      {
        label: 'All services',
        href: '/projects?tab=browse',
        icon: Grid3x3,
      },
      {
        label: 'My projects',
        href: '/projects/active',
        icon: FolderKanban,
      },
    ],
  },
  {
    label: 'Inbox',
    href: '/inbox',
    icon: Inbox,
  },
  {
    label: 'Account',
    icon: Wallet,
    subItems: [
      {
        label: 'Balance',
        href: '/account/balance',
        icon: CreditCard,
      },
      {
        label: 'Usage',
        href: '/account/usage',
        icon: BarChart3,
      },
      {
        label: 'Plan',
        href: '/account/plan',
        icon: Layers,
      },
      {
        label: 'Invoices',
        href: '/account/invoices',
        icon: FileText,
      },
      {
        label: 'Members',
        href: '/account/members',
        icon: Users,
      },
      {
        label: 'Teams',
        href: '/account/teams',
        icon: FolderTree,
      },
      {
        label: 'Settings',
        href: '/account/settings',
        icon: Settings,
      },
    ],
  },
  {
    label: 'Assets',
    href: '/assets',
    icon: Folder,
  },
];

const bottomNavigationItems: NavItem[] = [
  {
    label: 'Submit feedback',
    href: '/feedback',
    icon: MessageSquare,
  },
];

function isExpandableNavItem(item: NavItem | ExpandableNavItem): item is ExpandableNavItem {
  return 'subItems' in item;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Projects', 'Account']));
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { signOut } = useAuth();

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen bg-[#0e141d] transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex h-full flex-col">
        {/* Logo and Toggle */}
        <div className={`flex h-16 items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Image
                src="/superwork-icon-white.svg"
                alt="Superwork"
                width={32}
                height={32}
                priority
              />
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Image
                src="/superwork-logo-white.svg"
                alt="Superwork"
                width={140}
                height={28}
                priority
              />
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              if (isExpandableNavItem(item)) {
                const isExpanded = expandedSections.has(item.label);
                const Icon = item.icon;
                const hasActiveChild = item.subItems.some((subItem) => isActive(subItem.href));

                if (isCollapsed) {
                  // When collapsed, show only icon for expandable items
                  return (
                    <li key={item.label}>
                      <div
                        className={`flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          hasActiveChild
                            ? 'bg-white/10 text-white'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                        title={item.label}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <button
                      onClick={() => toggleSection(item.label)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        hasActiveChild
                          ? 'bg-white/10 text-white'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 space-y-1 pl-3">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const active = isActive(subItem.href);

                          return (
                            <li key={subItem.href}>
                              <Link
                                href={subItem.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  active
                                    ? 'bg-white/10 text-white'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <SubIcon className="h-4 w-4" />
                                <span>{subItem.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              } else {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-white/10 text-white'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              }
            })}
          </ul>
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-white/10 px-3 py-4">
          <ul className="space-y-1">
            {bottomNavigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
            {/* Sign out button */}
            <li>
              <button
                onClick={handleSignOut}
                className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-lg px-3 py-2 text-sm font-medium transition-colors text-gray-300 hover:bg-white/5 hover:text-white`}
                title={isCollapsed ? 'Sign out' : undefined}
              >
                <LogOut className="h-5 w-5" />
                {!isCollapsed && <span>Sign out</span>}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
