import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCustomerInvoices } from '@/lib/stripe/helpers';

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
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
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
      .single();

    const isOwner = workspace.owner_id === user.id;
    const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to view billing for this workspace' },
        { status: 403 }
      );
    }

    // Get invoices if customer exists
    let invoices = [];
    if (workspace.stripe_customer_id) {
      invoices = await getCustomerInvoices(workspace.stripe_customer_id);
    }

    return NextResponse.json({
      workspace,
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
