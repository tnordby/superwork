import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCustomerWorkspaceContext } from '@/lib/account/customer-workspace-context';
import { tryCreateServiceRoleClient } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe/config';
import { currentPeriodEndIsoFromSubscription, getCustomerInvoices } from '@/lib/stripe/helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    let workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      const ctx = await resolveCustomerWorkspaceContext(user.id);
      if ('error' in ctx) {
        return NextResponse.json({ error: ctx.error }, { status: ctx.status });
      }
      workspaceId = ctx.workspace.id;
    }

    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Check if user has permission
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isOwner = workspace.owner_id === user.id;
    const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to view billing for this workspace' },
        { status: 403 }
      );
    }

    let workspaceOut = workspace;
    if (workspace.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(workspace.stripe_subscription_id);
        const freshEnd = currentPeriodEndIsoFromSubscription(subscription);
        if (freshEnd) {
          if (freshEnd !== workspace.current_period_end) {
            const admin = tryCreateServiceRoleClient();
            if (admin) {
              await admin
                .from('workspaces')
                .update({ current_period_end: freshEnd })
                .eq('id', workspace.id);
            }
          }
          workspaceOut = { ...workspace, current_period_end: freshEnd };
        }
      } catch (error) {
        console.error('[billing/workspace] refresh current_period_end from Stripe', error);
      }
    }

    // Get invoices if customer exists
    let invoices: Awaited<ReturnType<typeof getCustomerInvoices>> = [];
    if (workspaceOut.stripe_customer_id) {
      invoices = await getCustomerInvoices(workspaceOut.stripe_customer_id);
    }

    return NextResponse.json({
      workspace: workspaceOut,
      invoices,
    });
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}
