import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff, isServicesAdmin } from '@/lib/auth/platform-role';

// GET - List SOPs for a service template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isInternalStaff(platformRole)) {
      return NextResponse.json({ error: 'Not authorized to view SOPs' }, { status: 403 });
    }

    const { data: sops, error } = await supabase
      .from('service_sops')
      .select('*')
      .eq('service_template_id', id)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching SOPs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sops: sops || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in SOPs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new SOP (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isServicesAdmin(platformRole)) {
      return NextResponse.json({ error: 'Only admins can create SOPs' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // Create SOP
    const { data: sop, error: createError } = await supabase
      .from('service_sops')
      .insert({
        service_template_id: id,
        title: body.title,
        description: body.description,
        order_index: body.order_index ?? 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating SOP:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ sop }, { status: 201 });
  } catch (error) {
    console.error('Error in SOPs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
