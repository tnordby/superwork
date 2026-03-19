'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlatformRole } from '@/lib/auth/platform-role';

type Row = { id: string; email: string; effectiveRole: PlatformRole };

const ROLE_OPTIONS: { value: PlatformRole; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'project_manager', label: 'Project manager' },
  { value: 'admin', label: 'Admin' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load');
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateRole(userId: string, role: PlatformRole) {
    setSavingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/platform-role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Update failed');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, effectiveRole: data.role ?? role } : u))
      );
    } catch {
      setError('Update failed');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900">Users & roles</h2>
      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Assign platform roles. Changes apply to authorization immediately; users may need to refresh or sign in again
        for all clients to pick up JWT metadata.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-gray-900">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
                      value={u.effectiveRole}
                      disabled={savingId === u.id}
                      onChange={(e) => void updateRole(u.id, e.target.value as PlatformRole)}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
