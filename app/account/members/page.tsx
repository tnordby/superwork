'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, UserPlus } from 'lucide-react';

type WorkspaceMember = {
  user_id: string;
  name: string;
  email: string | null;
  role: 'owner' | 'admin' | 'member' | 'consultant' | 'client' | 'viewer';
  invited_at: string;
  accepted_at: string | null;
};

export default function MembersPage() {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'member' | 'viewer'>('member');
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/account/workspace-members', { credentials: 'include' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load members');
      }
      setMembers(Array.isArray(data?.members) ? data.members : []);
      setCanManageMembers(Boolean(data?.can_manage_members));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  async function handleInvite() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/account/workspace-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, role: roleInput }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to invite colleague');
      }
      setEmailInput('');
      await loadMembers();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Failed to invite colleague');
    } finally {
      setSubmitting(false);
    }
  }

  const roleCounts = useMemo(() => {
    return members.reduce(
      (acc, member) => {
        const role = member.role === 'owner' || member.role === 'admin' ? 'admins' : 'members';
        acc[role] += 1;
        return acc;
      },
      { admins: 0, members: 0 }
    );
  }, [members]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-600">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-gray-900">All members ({members.length})</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-3xl font-semibold text-gray-900 mb-1">{roleCounts.admins}</div>
              <div className="text-sm text-gray-600">Owners & admins</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-3xl font-semibold text-gray-900 mb-1">{roleCounts.members}</div>
              <div className="text-sm text-gray-600">Members & viewers</div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white">
            {members.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No members yet.</div>
            ) : (
              members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-6 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Users className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.email || 'No email'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {member.role.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.accepted_at ? 'Active' : 'Invited'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Invite colleagues</h2>

            <div className="space-y-4">
              <div>
                <input
                  placeholder="name@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  disabled={!canManageMembers || submitting}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Role</label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as 'admin' | 'member' | 'viewer')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  disabled={!canManageMembers || submitting}
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                onClick={() => void handleInvite()}
                disabled={!canManageMembers || !emailInput.trim() || submitting}
                className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {submitting ? 'Inviting...' : 'Invite'}
                </span>
              </button>

              {!canManageMembers && (
                <p className="text-xs text-gray-500">
                  You need admin permissions to invite colleagues.
                </p>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
