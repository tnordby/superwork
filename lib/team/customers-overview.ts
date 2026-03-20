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

export async function loadCustomersOverview(): Promise<{
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

  const { data: workspaces, error: wsError } = await db
    .from('workspaces')
    .select(
      'id, name, owner_id, type, stripe_price_id, stripe_subscription_status, stripe_subscription_id'
    )
    .eq('type', 'client')
    .order('created_at', { ascending: false });
  if (wsError) throw new Error(wsError.message);

  const workspaceRows = workspaces ?? [];
  if (workspaceRows.length === 0) {
    return { rows: [], usedFallback };
  }

  const ownerIds = Array.from(new Set(workspaceRows.map((w: any) => w.owner_id).filter(Boolean)));
  const workspaceIds = workspaceRows.map((w: any) => w.id);

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

  const projectIds = (projectRows ?? []).map((p: any) => p.id);
  const projectToWorkspace = new Map((projectRows ?? []).map((p: any) => [p.id, p.workspace_id]));

  const [{ data: quoteRows }, { data: assignmentRows }, { data: memberProfiles }] = await Promise.all([
    projectIds.length > 0
      ? db
          .from('quotes')
          .select('project_id, assigned_lead_user_id, created_at')
          .in('project_id', projectIds)
          .not('assigned_lead_user_id', 'is', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    projectIds.length > 0
      ? db
          .from('project_assignments')
          .select('project_id, user_id, removed_at')
          .in('project_id', projectIds)
          .is('removed_at', null)
      : Promise.resolve({ data: [] as any[] }),
    memberRows && memberRows.length > 0
      ? db
          .from('profiles')
          .select('id, first_name, last_name')
          .in(
            'id',
            Array.from(new Set((memberRows ?? []).map((m: any) => m.user_id).filter(Boolean)))
          )
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const ownerNameById = new Map(
    (ownerProfiles ?? []).map((p: any) => [p.id, displayName(p.first_name, p.last_name)])
  );
  const profileNameById = new Map(
    (memberProfiles ?? []).map((p: any) => [p.id, displayName(p.first_name, p.last_name)])
  );
  const roleByUserId = new Map((roleRows ?? []).map((r: any) => [r.user_id, r.role]));

  const pmByWorkspaceId = new Map<string, string>();
  for (const row of quoteRows ?? []) {
    const workspaceId = projectToWorkspace.get((row as any).project_id);
    const leadId = (row as any).assigned_lead_user_id as string | null;
    if (!workspaceId || !leadId || pmByWorkspaceId.has(workspaceId)) continue;
    const role = roleByUserId.get(leadId);
    if (role === 'project_manager' || role === 'pm' || role === 'admin') {
      pmByWorkspaceId.set(workspaceId, profileNameById.get(leadId) || 'Unassigned');
    }
  }

  const consultantsByWorkspaceId = new Map<string, Set<string>>();
  for (const row of assignmentRows ?? []) {
    const workspaceId = projectToWorkspace.get((row as any).project_id);
    const consultantId = (row as any).user_id as string | null;
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
        .map((w: any) => (w.stripe_subscription_status === 'active' ? w.stripe_price_id : null))
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
    for (const invoice of invoiceRows as any[]) {
      const ownerId = invoice.user_id as string | null;
      if (!ownerId) continue;
      const current = manualMrrByOwnerId.get(ownerId) ?? 0;
      manualMrrByOwnerId.set(ownerId, current + Number(invoice.amount || 0) / 3);
    }
  }

  const rows: CustomerOverviewRow[] = workspaceRows.map((workspace: any) => {
    const stripeMrr =
      workspace.stripe_subscription_status === 'active' && workspace.stripe_price_id
        ? mrrByPriceId.get(workspace.stripe_price_id) ?? 0
        : 0;
    const manualMrr = manualMrrByOwnerId.get(workspace.owner_id) ?? 0;
    const totalMrr = Math.round((stripeMrr + manualMrr) * 100) / 100;
    return {
      id: workspace.id,
      name: workspace.name || ownerNameById.get(workspace.owner_id) || 'Customer',
      status: workspace.stripe_subscription_status === 'active' ? 'active' : 'inactive',
      projectManager: pmByWorkspaceId.get(workspace.id) || 'Unassigned',
      consultants: Array.from(consultantsByWorkspaceId.get(workspace.id) ?? []),
      mrr: totalMrr,
      arr: Math.round(totalMrr * 12 * 100) / 100,
    };
  });

  return { rows, usedFallback };
}

