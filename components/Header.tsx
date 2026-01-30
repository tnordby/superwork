'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, User, Settings, LogOut } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { useAuth } from './AuthProvider';

export function Header() {
  const { isCollapsed } = useSidebar();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Get user initials from metadata or email
  const getInitials = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    if (user?.email) {
      return user.email;
    }
    return 'User';
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className={`fixed top-0 right-0 z-30 h-16 border-b border-gray-200 bg-white transition-all duration-300 ${isCollapsed ? 'left-20' : 'left-64'}`}>
      <div className="flex h-full items-center justify-end gap-4 px-8">
        {/* Submit custom brief button */}
        <Link
          href="/custom-brief"
          className="rounded-full border-2 border-gray-900 bg-transparent px-6 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
        >
          Submit custom brief
        </Link>

        {/* Create new project button */}
        <Link
          href="/projects"
          className="rounded-full bg-[#bfe937] px-6 py-2.5 text-sm font-medium text-[#0e141d] transition-opacity hover:opacity-90"
        >
          Create new project
        </Link>

        {/* Notification bell */}
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </button>

        {/* User profile */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#bfe937] text-sm font-semibold text-[#0e141d] transition-opacity hover:opacity-90"
          >
            {getInitials()}
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
              {/* User info */}
              <div className="border-b border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">{getUserName()}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-2">
                <Link
                  href="/account/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <Link
                  href="/account/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </div>

              {/* Sign out */}
              <div className="border-t border-gray-100 py-2">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
