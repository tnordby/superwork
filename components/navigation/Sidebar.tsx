'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Zap,
  ClipboardList,
} from 'lucide-react';
import { normalizePlatformRole, isAdmin as isAdminRole, isQuoteManager } from '@/lib/auth/platform-role';

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

interface ClientSwitcherOption {
  id: string;
  name: string;
}

const ALL_CLIENTS_OPTION: ClientSwitcherOption = { id: '__all__', name: 'All clients' };

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

const projectsSection: ExpandableNavItem = {
  label: 'Projects',
  icon: Briefcase,
  subItems: [
    { label: 'All services', href: '/projects?tab=browse', icon: Grid3x3 },
    { label: 'My projects', href: '/projects/active', icon: FolderKanban },
  ],
};

const customerAccountSection: ExpandableNavItem = {
  label: 'Account',
  icon: Wallet,
  subItems: [
    { label: 'Balance', href: '/account/balance', icon: CreditCard },
    { label: 'Usage', href: '/account/usage', icon: BarChart3 },
    { label: 'Plan', href: '/account/plan', icon: Layers },
    { label: 'Invoices', href: '/account/invoices', icon: FileText },
    { label: 'Members', href: '/account/members', icon: Users },
    { label: 'Teams', href: '/account/teams', icon: FolderTree },
    { label: 'Settings', href: '/account/settings', icon: Settings },
    { label: 'Integrations', href: '/integrations', icon: Zap },
  ],
};

const internalWorkspaceSection: ExpandableNavItem = {
  label: 'Workspace',
  icon: Wallet,
  subItems: [{ label: 'Settings', href: '/account/settings', icon: Settings }],
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Projects', 'Account', 'Workspace']));
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { signOut, user, platformRole } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSwitcherOptions, setClientSwitcherOptions] = useState<ClientSwitcherOption[]>([]);

  const effectiveRole = platformRole ?? normalizePlatformRole(user?.user_metadata?.role);
  const useInternalShell = effectiveRole !== 'customer';
  const canSwitchClient = useInternalShell;

  useEffect(() => {
    if (!canSwitchClient) return;
    let mounted = true;
    const loadCustomers = async () => {
      try {
        const response = await fetch('/api/internal/selected-workspace', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !mounted) return;
        const rawCustomers = Array.isArray(data.options) ? data.options : [];
        const customers = [ALL_CLIENTS_OPTION, ...rawCustomers];
        setClientSwitcherOptions(customers);
        const userScopedKey = user?.id
          ? `internal_selected_client_id:${user.id}`
          : 'internal_selected_client_id';
        const stored = window.localStorage.getItem(userScopedKey);
        if (stored && customers.some((client: ClientSwitcherOption) => client.id === stored)) {
          setSelectedClientId(stored);
          return;
        }
        if (typeof data.workspace_id === 'string' && data.workspace_id) {
          setSelectedClientId(data.workspace_id);
          return;
        }
        setSelectedClientId('__all__');
      } catch {
        if (mounted) setClientSwitcherOptions([]);
      }
    };
    void loadCustomers();
    return () => {
      mounted = false;
    };
  }, [canSwitchClient, user?.id]);

  const selectedClientName =
    clientSwitcherOptions.find((c) => c.id === selectedClientId)?.name || 'Select client';

  const dynamicNavigationItems: (NavItem | ExpandableNavItem)[] = useMemo(() => {
    if (!useInternalShell) {
      const items: (NavItem | ExpandableNavItem)[] = [
        { label: 'Home', href: '/', icon: Home },
        ...(isAdminRole(effectiveRole) ? [{ label: 'Admin', href: '/admin', icon: Shield }] : []),
        projectsSection,
        { label: 'Inbox', href: '/inbox', icon: Inbox },
        customerAccountSection,
        { label: 'Assets', href: '/assets', icon: Folder },
      ];
      return items;
    }

    const items: (NavItem | ExpandableNavItem)[] = [
      { label: 'Team home', href: '/team', icon: Home },
      { label: 'Inbox', href: '/inbox', icon: Inbox },
      projectsSection,
    ];

    if (isQuoteManager(effectiveRole)) {
      items.push({ label: 'Quotes', href: '/team/quotes', icon: ClipboardList });
    }
    items.push({ label: 'Customers', href: '/team/customers', icon: Users });

    if (isAdminRole(effectiveRole)) {
      items.push({ label: 'Admin', href: '/admin', icon: Shield });
    }

    items.push(internalWorkspaceSection, { label: 'Assets', href: '/assets', icon: Folder });
    return items;
  }, [useInternalShell, effectiveRole]);

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

  const internalShellByRole: Record<string, string> = {
    project_manager: 'bg-[#1f2937]',
    consultant: 'bg-[#0f2b33]',
    admin: 'bg-[#2a1f36]',
  };
  const asideClass = useInternalShell
    ? internalShellByRole[effectiveRole] || 'bg-[#1a2332]'
    : 'bg-[#1a2332]';

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen ${asideClass} transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
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
              <div className="flex min-w-0 flex-col gap-1">
                <Image
                  src="/superwork-logo-white.svg"
                  alt="Superwork"
                  width={140}
                  height={28}
                  priority
                  className="max-w-[140px]"
                />
              </div>
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
          {canSwitchClient && !isCollapsed && clientSwitcherOptions.length > 0 && (
            <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={async (e) => {
                    const nextId = e.target.value;
                    setSelectedClientId(nextId);
                    const userScopedKey = user?.id
                      ? `internal_selected_client_id:${user.id}`
                      : 'internal_selected_client_id';
                    window.localStorage.setItem(userScopedKey, nextId);
                    await fetch('/api/internal/selected-workspace', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ workspace_id: nextId === '__all__' ? null : nextId }),
                    });
                    router.refresh();
                  }}
                  className="w-full appearance-none rounded-md border border-white/10 bg-[#1f2a3a] px-2 py-1.5 pr-8 text-xs text-gray-100 focus:outline-none"
                  aria-label="Switch client context"
                >
                  {clientSwitcherOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}
          {canSwitchClient && isCollapsed && clientSwitcherOptions.length > 0 && (
            <div className="mb-3 flex justify-center">
              <div
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-gray-300"
                title={`Client: ${selectedClientName}`}
              >
                {selectedClientName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}
          <ul className="space-y-1">
            {dynamicNavigationItems.map((item) => {
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
