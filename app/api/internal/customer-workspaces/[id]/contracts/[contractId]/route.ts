import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';

type ContractPatchPayload = {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contractId: string }> }
) {
  try {
    const { id, contractId } = await params;
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

    const body = (await request.json()) as ContractPatchPayload;
    const patch: Record<string, unknown> = {};

    if (body.billing_source !== undefined) patch.billing_source = body.billing_source;
    if (body.status !== undefined) patch.status = body.status;
    if (body.monthly_amount !== undefined) patch.monthly_amount = Number(body.monthly_amount);
    if (body.currency !== undefined) patch.currency = body.currency.toUpperCase();
    if (body.start_date !== undefined) patch.start_date = body.start_date;
    if (body.end_date !== undefined) patch.end_date = body.end_date || null;
    if (body.notes !== undefined) patch.notes = body.notes || null;

    let db: ReturnType<typeof createServiceRoleClient> | typeof supabase;
    try {
      db = createServiceRoleClient();
    } catch {
      db = supabase;
    }

    const { data: updated, error } = await db
      .from('workspace_contracts')
      .update(patch)
      .eq('id', contractId)
      .eq('workspace_id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contract: updated }, { status: 200 });
  } catch (error) {
    console.error('[customer-workspaces/contracts] PATCH failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contractId: string }> }
) {
  try {
    const { id, contractId } = await params;
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

    let db: ReturnType<typeof createServiceRoleClient> | typeof supabase;
    try {
      db = createServiceRoleClient();
    } catch {
      db = supabase;
    }

    const { error } = await db
      .from('workspace_contracts')
      .delete()
      .eq('id', contractId)
      .eq('workspace_id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[customer-workspaces/contracts] DELETE failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

