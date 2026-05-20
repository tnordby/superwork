import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCustomerWorkspaceContext } from '@/lib/account/customer-workspace-context';
import { getWorkspaceProjectCreationEligibility } from '@/lib/billing/project-creation-eligibility';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (isInternalStaff(platformRole)) {
      return NextResponse.json({
        allowed: true,
        hasActivePlan: true,
        hasAvailableBalance: true,
        availableBalanceCents: 0,
        internalBypass: true,
      });
    }

    const ctx = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { data: workspace, error: workspaceError } = await ctx.admin
      .from('workspaces')
      .select('stripe_subscription_status')
      .eq('id', ctx.workspace.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const eligibility = await getWorkspaceProjectCreationEligibility(
      ctx.admin,
      ctx.workspace.id,
      workspace.stripe_subscription_status
    );

    return NextResponse.json(eligibility);
  } catch (error) {
    console.error('[project-creation-eligibility]', error);
    return NextResponse.json({ error: 'Failed to check plan status' }, { status: 500 });
  }
}
