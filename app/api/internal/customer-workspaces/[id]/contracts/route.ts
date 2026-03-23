import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';

type ContractPayload = {
  billing_source?: 'stripe' | 'manual';
  status?: 'active' | 'draft' | 'ended' | 'cancelled';
  monthly_amount?: number;
  currency?: string;
  start_date?: string;
  end_date?: string | null;
  notes?: string | null;
};

function canManageContracts(role: string): boolean {
  return role === 'admin' || role === 'project_manager';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isInternalStaff(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let db: ReturnType<typeof createServiceRoleClient> | typeof supabase;
    try {
      db = createServiceRoleClient();
    } catch {
      db = supabase;
    }

    const { data: workspace, error: wsError } = await db
      .from('workspaces')
      .select('id')
      .eq('id', id)
      .eq('type', 'client')
      .maybeSingle();
    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const { data: contracts, error } = await db
      .from('workspace_contracts')
      .select('*')
      .eq('workspace_id', id)
      .order('start_date', { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { contracts: contracts || [], can_manage: canManageContracts(role) },
      { status: 200 }
    );
  } catch (error) {
    console.error('[customer-workspaces/contracts] GET failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!canManageContracts(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as ContractPayload;
    if (!body.start_date || body.monthly_amount === undefined || body.monthly_amount === null) {
      return NextResponse.json(
        { error: 'Missing required fields: start_date, monthly_amount' },
        { status: 400 }
      );
    }

    let db: ReturnType<typeof createServiceRoleClient> | typeof supabase;
    try {
      db = createServiceRoleClient();
    } catch {
      db = supabase;
    }

    const { data: inserted, error } = await db
      .from('workspace_contracts')
      .insert({
        workspace_id: id,
        billing_source: body.billing_source || 'manual',
        status: body.status || 'active',
        monthly_amount: Number(body.monthly_amount || 0),
        currency: (body.currency || 'USD').toUpperCase(),
        start_date: body.start_date,
        end_date: body.end_date || null,
        notes: body.notes || null,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contract: inserted }, { status: 201 });
  } catch (error) {
    console.error('[customer-workspaces/contracts] POST failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

