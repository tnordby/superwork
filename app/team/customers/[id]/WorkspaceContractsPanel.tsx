'use client';

import { useCallback, useEffect, useState } from 'react';

type ContractRow = {
  id: string;
  billing_source: 'stripe' | 'manual';
  status: 'active' | 'draft' | 'ended' | 'cancelled';
  monthly_amount: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
};

type DraftContract = {
  billing_source: 'stripe' | 'manual';
  status: 'active' | 'draft' | 'ended' | 'cancelled';
  monthly_amount: string;
  currency: string;
  start_date: string;
  end_date: string;
  notes: string;
};

const emptyDraft: DraftContract = {
  billing_source: 'manual',
  status: 'active',
  monthly_amount: '',
  currency: 'USD',
  start_date: '',
  end_date: '',
  notes: '',
};

export function WorkspaceContractsPanel({ workspaceId }: { workspaceId: string }) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftContract>(emptyDraft);
  const [creating, setCreating] = useState(false);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/internal/customer-workspaces/${workspaceId}/contracts`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok) {
      setContracts(data.contracts || []);
      setCanManage(Boolean(data.can_manage));
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    void loadContracts();
  }, [loadContracts]);

  async function createContract() {
    setCreating(true);
    const response = await fetch(`/api/internal/customer-workspaces/${workspaceId}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...draft,
        monthly_amount: Number(draft.monthly_amount || 0),
        end_date: draft.end_date || null,
        notes: draft.notes || null,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || 'Failed to create contract');
      setCreating(false);
      return;
    }
    setDraft(emptyDraft);
    await loadContracts();
    setCreating(false);
  }

  async function saveContract(contract: ContractRow) {
    setSavingId(contract.id);
    const response = await fetch(
      `/api/internal/customer-workspaces/${workspaceId}/contracts/${contract.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...contract,
          end_date: contract.end_date || null,
          notes: contract.notes || null,
        }),
      }
    );
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || 'Failed to update contract');
      setSavingId(null);
      return;
    }
    await loadContracts();
    setSavingId(null);
  }

  async function deleteContract(contractId: string) {
    if (!window.confirm('Delete this contract?')) return;
    setSavingId(contractId);
    const response = await fetch(
      `/api/internal/customer-workspaces/${workspaceId}/contracts/${contractId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || 'Failed to delete contract');
      setSavingId(null);
      return;
    }
    await loadContracts();
    setSavingId(null);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Contracts</h2>
        <p className="mt-1 text-sm text-gray-600">
          Maintain contract terms to drive accurate MRR and ARR metrics.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading contracts...</p>
      ) : contracts.length === 0 ? (
        <p className="text-sm text-gray-500">No contracts yet.</p>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div key={contract.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border border-gray-200 p-3">
              <select
                value={contract.billing_source}
                disabled={!canManage}
                onChange={(e) =>
                  setContracts((prev) =>
                    prev.map((row) =>
                      row.id === contract.id
                        ? { ...row, billing_source: e.target.value as ContractRow['billing_source'] }
                        : row
                    )
                  )
                }
                className="md:col-span-2 rounded-md border border-gray-300 px-2 py-2 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="stripe">Stripe</option>
              </select>
              <input
                type="number"
                value={contract.monthly_amount}
                disabled={!canManage}
                onChange={(e) =>
                  setContracts((prev) =>
                    prev.map((row) =>
                      row.id === contract.id ? { ...row, monthly_amount: Number(e.target.value || 0) } : row
                    )
                  )
                }
                className="md:col-span-2 rounded-md border border-gray-300 px-2 py-2 text-sm"
                placeholder="Monthly amount"
              />
              <input
                value={contract.currency}
                disabled={!canManage}
                onChange={(e) =>
                  setContracts((prev) =>
                    prev.map((row) =>
                      row.id === contract.id ? { ...row, currency: e.target.value.toUpperCase() } : row
                    )
                  )
                }
                className="md:col-span-1 rounded-md border border-gray-300 px-2 py-2 text-sm"
                placeholder="USD"
              />
              <input
                type="date"
                value={contract.start_date}
                disabled={!canManage}
                onChange={(e) =>
                  setContracts((prev) =>
                    prev.map((row) => (row.id === contract.id ? { ...row, start_date: e.target.value } : row))
                  )
                }
                className="md:col-span-2 rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
              <input
                type="date"
                value={contract.end_date || ''}
                disabled={!canManage}
                onChange={(e) =>
                  setContracts((prev) =>
                    prev.map((row) =>
                      row.id === contract.id ? { ...row, end_date: e.target.value || null } : row
                    )
                  )
                }
                className="md:col-span-2 rounded-md border border-gray-300 px-2 py-2 text-sm"
              />
              <select
                value={contract.status}
                disabled={!canManage}
                onChange={(e) =>
                  setContracts((prev) =>
                    prev.map((row) =>
                      row.id === contract.id
                        ? { ...row, status: e.target.value as ContractRow['status'] }
                        : row
                    )
                  )
                }
                className="md:col-span-2 rounded-md border border-gray-300 px-2 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <textarea
                value={contract.notes || ''}
                disabled={!canManage}
                onChange={(e) =>
                  setContracts((prev) =>
                    prev.map((row) => (row.id === contract.id ? { ...row, notes: e.target.value } : row))
                  )
                }
                className="md:col-span-10 rounded-md border border-gray-300 px-2 py-2 text-sm"
                rows={2}
                placeholder="Notes"
              />
              {canManage && (
                <div className="md:col-span-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => saveContract(contract)}
                    disabled={savingId === contract.id}
                    className="rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white"
                  >
                    {savingId === contract.id ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteContract(contract.id)}
                    disabled={savingId === contract.id}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="rounded-lg border border-dashed border-gray-300 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">Add contract</p>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <select
              value={draft.billing_source}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, billing_source: e.target.value as DraftContract['billing_source'] }))
              }
              className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="manual">Manual</option>
              <option value="stripe">Stripe</option>
            </select>
            <input
              type="number"
              value={draft.monthly_amount}
              onChange={(e) => setDraft((prev) => ({ ...prev, monthly_amount: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-2 text-sm"
              placeholder="Monthly amount"
            />
            <input
              value={draft.currency}
              onChange={(e) => setDraft((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
              className="rounded-md border border-gray-300 px-2 py-2 text-sm"
              placeholder="USD"
            />
            <input
              type="date"
              value={draft.start_date}
              onChange={(e) => setDraft((prev) => ({ ...prev, start_date: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            />
            <input
              type="date"
              value={draft.end_date}
              onChange={(e) => setDraft((prev) => ({ ...prev, end_date: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            />
            <select
              value={draft.status}
              onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as DraftContract['status'] }))}
              className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
            rows={2}
            placeholder="Notes"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={createContract}
              disabled={creating}
              className="rounded-md bg-[#bfe937] px-4 py-2 text-sm font-medium text-gray-900"
            >
              {creating ? 'Adding...' : 'Add contract'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

