'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, UserPlus } from 'lucide-react';
import { formatAmount } from '@/lib/stripe/utils';

type TeamMember = { user_id: string; name: string; email: string | null };

type Team = {
  id: string;
  name: string;
  description: string | null;
  budget_allocated_cents: number;
  used_cents?: number;
  committed_cents?: number;
  remaining_envelope_cents?: number;
  over_envelope?: boolean;
  created_at: string;
  members: TeamMember[];
};

type WorkspaceMember = {
  user_id: string;
  role: string;
  name: string;
  email: string | null;
};

type BudgetPayload = {
  currency: string;
  total_purchased_cents: number;
  used_cents: number;
  committed_cents: number;
  available_cents: number;
};

export default function TeamsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManageTeams, setCanManageTeams] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [budget, setBudget] = useState<BudgetPayload | null>(null);
  const [totalAllocatedCents, setTotalAllocatedCents] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [teamSpendCostColumnMissing, setTeamSpendCostColumnMissing] = useState(false);

  const currency = budget?.currency ?? 'usd';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/account/workspace-teams', { credentials: 'include' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load teams');
      }
      setWorkspaceName(typeof data?.workspace?.name === 'string' ? data.workspace.name : '');
      setCanManageTeams(Boolean(data?.can_manage_teams));
      setBudget(data?.budget ?? null);
      setTotalAllocatedCents(Number(data?.total_allocated_cents ?? 0));
      setTeams(Array.isArray(data?.teams) ? data.teams : []);
      setWorkspaceMembers(Array.isArray(data?.workspace_members) ? data.workspace_members : []);
      setTeamSpendCostColumnMissing(Boolean(data?.team_spend_cost_column_missing));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unallocatedCents = useMemo(() => {
    if (!budget) return null;
    return budget.available_cents - totalAllocatedCents;
  }, [budget, totalAllocatedCents]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/account/workspace-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description: newDescription.trim() || undefined,
          budget_allocated: newBudget.trim() === '' ? 0 : newBudget,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not create team');
      }
      setNewName('');
      setNewDescription('');
      setNewBudget('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create team');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(team: Team) {
    setEditingId(team.id);
    setEditName(team.name);
    setEditDescription(team.description ?? '');
    setEditBudget(String((team.budget_allocated_cents / 100).toFixed(2)));
  }

  async function handleSaveEdit(teamId: string) {
    const name = editName.trim();
    if (!name) return;

    setSavingEdit(true);
    setError(null);
    try {
      const response = await fetch(`/api/account/workspace-teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description: editDescription.trim() || null,
          budget_allocated: editBudget,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not update team');
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update team');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!globalThis.confirm('Delete this team? People will be removed from the team; workspace members are unchanged.')) {
      return;
    }
    setDeletingId(teamId);
    setError(null);
    try {
      const response = await fetch(`/api/account/workspace-teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not delete team');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete team');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddMember(teamId: string) {
    if (!addMemberUserId) return;
    setAddingMember(true);
    setError(null);
    try {
      const response = await fetch(`/api/account/workspace-teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: addMemberUserId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not add to team');
      }
      setAddMemberTeamId(null);
      setAddMemberUserId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to team');
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(teamId: string, userId: string) {
    setError(null);
    try {
      const q = new URLSearchParams({ user_id: userId });
      const response = await fetch(`/api/account/workspace-teams/${teamId}/members?${q}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not remove from team');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove from team');
    }
  }

  function candidatesForTeam(team: Team) {
    const onTeam = new Set(team.members.map((m) => m.user_id));
    return workspaceMembers.filter((m) => !onTeam.has(m.user_id));
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-sm text-gray-600">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Teams</h1>
          <p className="mt-1 text-gray-600">
            Group colleagues and set budget envelopes per team. Link projects to a team when you create them so used and
            committed spend rolls up here. Inviting people to your workspace still happens under{' '}
            <Link href="/account/members" className="text-gray-900 underline underline-offset-2">
              Members
            </Link>
            .
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {teamSpendCostColumnMissing ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Project spend totals are temporarily unavailable: the database is missing the{' '}
          <code className="rounded bg-amber-100 px-1">projects.cost</code> column. Team used/committed amounts show as
          $0 until your database includes that column (run migration{' '}
          <code className="rounded bg-amber-100 px-1">038_ensure_projects_cost_column.sql</code> or reload the Supabase
          API schema after adding it).
        </div>
      ) : null}

      {budget ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Available balance</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {formatAmount(budget.available_cents, currency)}
            </div>
            <p className="mt-2 text-xs text-gray-500">After committed and used project spend.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Allocated to teams</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {formatAmount(totalAllocatedCents, currency)}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Not yet assigned</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {unallocatedCents !== null ? formatAmount(unallocatedCents, currency) : '—'}
            </div>
            <p className="mt-2 text-xs text-gray-500">Room left before you hit your available balance.</p>
          </div>
        </div>
      ) : null}

      {workspaceName ? (
        <p className="mb-6 text-sm text-gray-500">
          Workspace: <span className="font-medium text-gray-800">{workspaceName}</span>
        </p>
      ) : null}

      {canManageTeams ? (
        <form
          onSubmit={handleCreateTeam}
          className="mb-10 rounded-2xl border border-gray-200 bg-white p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900">Create a team</h2>
          <p className="mt-1 text-sm text-gray-600">
            Examples: Sales, Marketing, Product. Budget is an envelope against your workspace balance; assign a team on
            each project to attribute spend to that envelope.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="team-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Marketing"
                required
              />
            </div>
            <div>
              <label htmlFor="team-budget" className="block text-sm font-medium text-gray-700">
                Budget allocation
              </label>
              <input
                id="team-budget"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="team-desc" className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <input
                id="team-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="What this team uses Superwork for"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Layers className="h-4 w-4" />
              {creating ? 'Creating…' : 'Create team'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          Only workspace owners and admins can create teams or change allocations. Ask an admin if you need a new
          team.
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your teams</h2>

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-600">
          <p>No teams yet.</p>
          {canManageTeams ? (
            <p className="mt-2 text-sm">Create one above to organize people and budget.</p>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-4">
          {teams.map((team) => (
            <li key={team.id} className="rounded-2xl border border-gray-200 bg-white p-6">
              {editingId === team.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Budget</label>
                      <input
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={() => void handleSaveEdit(team.id)}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                      {team.description ? (
                        <p className="mt-1 text-sm text-gray-600">{team.description}</p>
                      ) : null}
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="text-gray-500">Envelope allocated:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {formatAmount(team.budget_allocated_cents, currency)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Used (completed projects):</span>{' '}
                          <span className="font-medium text-gray-900">
                            {formatAmount(team.used_cents ?? 0, currency)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Committed (active projects):</span>{' '}
                          <span className="font-medium text-gray-900">
                            {formatAmount(team.committed_cents ?? 0, currency)}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-500">Remaining in envelope:</span>{' '}
                          <span
                            className={`font-medium ${
                              (team.remaining_envelope_cents ?? 0) < 0 ? 'text-red-600' : 'text-gray-900'
                            }`}
                          >
                            {formatAmount(team.remaining_envelope_cents ?? 0, currency)}
                          </span>
                        </p>
                        {team.over_envelope ? (
                          <p className="text-xs text-amber-800">
                            Used and committed on linked projects exceed this team&apos;s envelope. Raise the team budget
                            or reassign projects.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {canManageTeams ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(team)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === team.id}
                          onClick={() => void handleDeleteTeam(team.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
                        >
                          {deletingId === team.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700">People on this team</span>
                      {canManageTeams && candidatesForTeam(team).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAddMemberTeamId(addMemberTeamId === team.id ? null : team.id);
                            setAddMemberUserId('');
                          }}
                          className="inline-flex items-center gap-1 text-sm text-gray-900 underline underline-offset-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Add from workspace
                        </button>
                      ) : null}
                    </div>

                    {canManageTeams && addMemberTeamId === team.id ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600">Workspace member</label>
                          <select
                            value={addMemberUserId}
                            onChange={(e) => setAddMemberUserId(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="">Choose…</option>
                            {candidatesForTeam(team).map((m) => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.name}
                                {m.email ? ` (${m.email})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          disabled={!addMemberUserId || addingMember}
                          onClick={() => void handleAddMember(team.id)}
                          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    ) : null}

                    {team.members.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-500">No one assigned yet.</p>
                    ) : (
                      <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {team.members.map((m) => (
                          <li key={m.user_id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span>
                              <span className="font-medium text-gray-900">{m.name}</span>
                              {m.email ? (
                                <span className="text-gray-500"> · {m.email}</span>
                              ) : null}
                            </span>
                            {canManageTeams ? (
                              <button
                                type="button"
                                onClick={() => void handleRemoveMember(team.id, m.user_id)}
                                className="shrink-0 text-xs text-red-600 hover:underline"
                              >
                                Remove
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
