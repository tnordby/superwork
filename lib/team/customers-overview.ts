import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';

export interface CustomerOverviewRow {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  projectManager: string;
  consultants: string[];
  mrr: number;
  arr: number;
}

function displayName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  return full || 'Unknown';
}

function convertToMonthlyCents(
  unitAmountCents: number | null,
  interval: string | null,
  intervalCount: number | null
): number {
  if (!unitAmountCents || !interval) return 0;
  const count = intervalCount && intervalCount > 0 ? intervalCount : 1;
  if (interval === 'month') return Math.round(unitAmountCents / count);
  if (interval === 'year') return Math.round(unitAmountCents / (12 * count));
  if (interval === 'week') return Math.round((unitAmountCents * 52) / (12 * count));
  if (interval === 'day') return Math.round((unitAmountCents * 365) / (12 * count));
  return 0;
}

type WorkspaceContractRow = {
  workspace_id: string;
  monthly_amount: number;
  start_date: string;
  end_date: string | null;
  status: string;
};

type ClientWorkspaceListRow = {
  id: string;
  name: string | null;
  owner_id: string;
  type: string;
  stripe_price_id: string | null;
  stripe_subscription_status: string | null;
  stripe_subscription_id: string | null;
};

type ProjectWorkspaceRow = { id: string; workspace_id: string };

type WorkspaceMemberConsultantRow = {
  workspace_id: string;
  user_id: string;
  role: string;
};

type QuoteLeadRow = {
  project_id: string;
  assigned_lead_user_id: string | null;
  created_at: string;
};

type ProjectAssignmentRow = { project_id: string; user_id: string };

type ProfileNameRow = { id: string; first_name: string | null; last_name: string | null };

type PlatformRoleRow = { user_id: string; role: string };

type PaidInvoiceRow = {
  user_id: string | null;
  amount: number | null;
  status: string;
  paid_at: string | null;
  created_at: string;
};

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function overlapDaysInclusive(
  rangeStart: Date,
  rangeEnd: Date,
  windowStart: Date,
  windowEnd: Date
): number {
  const start = rangeStart > windowStart ? rangeStart : windowStart;
  const end = rangeEnd < windowEnd ? rangeEnd : windowEnd;
  if (start > end) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

export async function loadCustomersOverview(): Promise<{
  rows: CustomerOverviewRow[];
  usedFallback: boolean;
}> {
  return loadCustomersOverviewForWorkspace();
}

export async function loadCustomersOverviewForWorkspace(
  workspaceIdFilter?: string | null
): Promise<{
  rows: CustomerOverviewRow[];
  usedFallback: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const actorRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  if (!isInternalStaff(actorRole)) {
    throw new Error('Forbidden');
  }

  let db: ReturnType<typeof createServiceRoleClient> | typeof supabase;
  let usedFallback = false;
  try {
    db = createServiceRoleClient();
  } catch {
    db = supabase;
    usedFallback = true;
  }

  let workspacesQuery = db
    .from('workspaces')
    .select(
      'id, name, owner_id, type, stripe_price_id, stripe_subscription_status, stripe_subscription_id'
    )
    .eq('type', 'client')
    .order('created_at', { ascending: false });
  if (workspaceIdFilter) {
    workspacesQuery = workspacesQuery.eq('id', workspaceIdFilter);
  }
  const { data: workspaces, error: wsError } = await workspacesQuery;
  if (wsError) throw new Error(wsError.message);

  const workspaceRows = (workspaces ?? []) as ClientWorkspaceListRow[];
  if (workspaceRows.length === 0) {
    return { rows: [], usedFallback };
  }

  const ownerIds = Array.from(new Set(workspaceRows.map((w) => w.owner_id).filter(Boolean)));
  const workspaceIds = workspaceRows.map((w) => w.id);

  const [{ data: ownerProfiles }, { data: memberRows }, { data: projectRows }, { data: roleRows }] =
    await Promise.all([
      db.from('profiles').select('id, first_name, last_name').in('id', ownerIds),
      db
        .from('workspace_members')
        .select('workspace_id, user_id, role')
        .in('workspace_id', workspaceIds)
        .eq('role', 'consultant'),
      db.from('projects').select('id, workspace_id').in('workspace_id', workspaceIds),
      db.from('user_platform_roles').select('user_id, role'),
    ]);

  const { data: contractRows } = await db
    .from('workspace_contracts')
    .select('workspace_id, monthly_amount, start_date, end_date, status')
    .in('workspace_id', workspaceIds)
    .eq('status', 'active');

  const projectList = (projectRows ?? []) as ProjectWorkspaceRow[];
  const projectIds = projectList.map((p) => p.id);
  const projectToWorkspace = new Map(projectList.map((p) => [p.id, p.workspace_id]));

  const [{ data: quoteRows }, { data: assignmentRows }, { data: memberProfiles }] = await Promise.all([
    projectIds.length > 0
      ? db
          .from('quotes')
          .select('project_id, assigned_lead_user_id, created_at')
          .in('project_id', projectIds)
          .not('assigned_lead_user_id', 'is', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as QuoteLeadRow[] }),
    projectIds.length > 0
      ? db
          .from('project_assignments')
          .select('project_id, user_id, removed_at')
          .in('project_id', projectIds)
          .is('removed_at', null)
      : Promise.resolve({ data: [] as ProjectAssignmentRow[] }),
    memberRows && memberRows.length > 0
      ? db
          .from('profiles')
          .select('id, first_name, last_name')
          .in(
            'id',
            Array.from(
              new Set(
                (memberRows as WorkspaceMemberConsultantRow[]).map((m) => m.user_id).filter(Boolean)
              )
            )
          )
      : Promise.resolve({ data: [] as ProfileNameRow[] }),
  ]);

  const ownerProfileRows = (ownerProfiles ?? []) as ProfileNameRow[];
  const ownerNameById = new Map(
    ownerProfileRows.map((p) => [p.id, displayName(p.first_name, p.last_name)])
  );
  const memberProfileRows = (memberProfiles ?? []) as ProfileNameRow[];
  const profileNameById = new Map(
    memberProfileRows.map((p) => [p.id, displayName(p.first_name, p.last_name)])
  );
  const platformRoleRows = (roleRows ?? []) as PlatformRoleRow[];
  const roleByUserId = new Map(platformRoleRows.map((r) => [r.user_id, r.role]));

  const pmByWorkspaceId = new Map<string, string>();
  for (const row of (quoteRows ?? []) as QuoteLeadRow[]) {
    const workspaceId = projectToWorkspace.get(row.project_id);
    const leadId = row.assigned_lead_user_id;
    if (!workspaceId || !leadId || pmByWorkspaceId.has(workspaceId)) continue;
    const role = roleByUserId.get(leadId);
    if (role === 'project_manager' || role === 'pm' || role === 'admin') {
      pmByWorkspaceId.set(workspaceId, profileNameById.get(leadId) || 'Unassigned');
    }
  }

  const consultantsByWorkspaceId = new Map<string, Set<string>>();
  for (const row of (assignmentRows ?? []) as ProjectAssignmentRow[]) {
    const workspaceId = projectToWorkspace.get(row.project_id);
    const consultantId = row.user_id;
    if (!workspaceId || !consultantId) continue;
    const role = roleByUserId.get(consultantId);
    if (role !== 'consultant') continue;
    if (!consultantsByWorkspaceId.has(workspaceId)) {
      consultantsByWorkspaceId.set(workspaceId, new Set());
    }
    consultantsByWorkspaceId.get(workspaceId)!.add(profileNameById.get(consultantId) || 'Consultant');
  }

  const stripePriceIds = Array.from(
    new Set(
      workspaceRows
        .map((w) => (w.stripe_subscription_status === 'active' ? w.stripe_price_id : null))
        .filter(Boolean)
    )
  ) as string[];
  const mrrByPriceId = new Map<string, number>();
  if (stripePriceIds.length > 0 && process.env.STRIPE_SECRET_KEY) {
    const { stripe } = await import('@/lib/stripe/config');
    await Promise.all(
      stripePriceIds.map(async (priceId) => {
        try {
          const price = await stripe.prices.retrieve(priceId);
          const monthlyCents = convertToMonthlyCents(
            price.unit_amount,
            price.recurring?.interval ?? null,
            price.recurring?.interval_count ?? null
          );
          mrrByPriceId.set(priceId, monthlyCents / 100);
        } catch {
          mrrByPriceId.set(priceId, 0);
        }
      })
    );
  }

  const manualMrrByOwnerId = new Map<string, number>();
  const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invoiceRows, error: invoiceError } = await db
    .from('invoices')
    .select('user_id, amount, status, paid_at, created_at')
    .eq('status', 'paid')
    .gte('created_at', ninetyDaysAgoIso);

  if (!invoiceError && invoiceRows) {
    for (const invoice of invoiceRows as PaidInvoiceRow[]) {
      const ownerId = invoice.user_id;
      if (!ownerId) continue;
      const current = manualMrrByOwnerId.get(ownerId) ?? 0;
      manualMrrByOwnerId.set(ownerId, current + Number(invoice.amount || 0) / 3);
    }
  }

  const today = toDateOnly(new Date());
  const futureEnd = toDateOnly(
    new Date(Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), today.getUTCDate() - 1))
  );
  const contractMrrByWorkspace = new Map<string, number>();
  const contractArrByWorkspace = new Map<string, number>();

  for (const contract of (contractRows ?? []) as WorkspaceContractRow[]) {
    const workspaceId = contract.workspace_id;
    const monthlyAmount = Number(contract.monthly_amount || 0);
    if (!workspaceId || monthlyAmount <= 0) continue;

    const contractStart = toDateOnly(new Date(contract.start_date));
    const contractEnd = contract.end_date
      ? toDateOnly(new Date(contract.end_date))
      : toDateOnly(new Date(Date.UTC(9999, 11, 31)));
    if (Number.isNaN(contractStart.getTime()) || Number.isNaN(contractEnd.getTime())) continue;

    const activeNow = overlapDaysInclusive(contractStart, contractEnd, today, today) > 0;
    if (activeNow) {
      contractMrrByWorkspace.set(
        workspaceId,
        (contractMrrByWorkspace.get(workspaceId) ?? 0) + monthlyAmount
      );
    }

    const overlapDays = overlapDaysInclusive(contractStart, contractEnd, today, futureEnd);
    if (overlapDays > 0) {
      const prorated = monthlyAmount * (overlapDays / 30.4375);
      contractArrByWorkspace.set(
        workspaceId,
        (contractArrByWorkspace.get(workspaceId) ?? 0) + prorated
      );
    }
  }

  const rows: CustomerOverviewRow[] = workspaceRows.map((workspace) => {
    const stripeMrr =
      workspace.stripe_subscription_status === 'active' && workspace.stripe_price_id
        ? mrrByPriceId.get(workspace.stripe_price_id) ?? 0
        : 0;
    const manualMrr = manualMrrByOwnerId.get(workspace.owner_id) ?? 0;
    const fallbackMrr = Math.round((stripeMrr + manualMrr) * 100) / 100;
    const contractMrr = Math.round((contractMrrByWorkspace.get(workspace.id) ?? 0) * 100) / 100;
    const contractArr = Math.round((contractArrByWorkspace.get(workspace.id) ?? 0) * 100) / 100;
    const totalMrr = contractMrr > 0 ? contractMrr : fallbackMrr;
    const totalArr = contractArr > 0 ? contractArr : Math.round(totalMrr * 12 * 100) / 100;
    return {
      id: workspace.id,
      name: workspace.name || ownerNameById.get(workspace.owner_id) || 'Customer',
      status: workspace.stripe_subscription_status === 'active' ? 'active' : 'inactive',
      projectManager: pmByWorkspaceId.get(workspace.id) || 'Unassigned',
      consultants: Array.from(consultantsByWorkspaceId.get(workspace.id) ?? []),
      mrr: totalMrr,
      arr: totalArr,
    };
  });

  return { rows, usedFallback };
}

