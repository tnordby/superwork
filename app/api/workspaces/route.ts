import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET all workspaces for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get workspaces (RLS handles access control)
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Workspaces query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workspaces' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspaces: workspaces || [] }, { status: 200 });
  } catch (error) {
    console.error('Workspaces GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create a new workspace
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { name, type = 'client', settings = {} } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    // 3. Create workspace
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert({
        name,
        owner_id: user.id,
        type,
        settings,
      })
      .select()
      .single();

    if (createError) {
      console.error('Workspace creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      );
    }

    // 4. Create default asset categories
    const { error: categoriesError } = await supabase.rpc(
      'create_default_asset_categories',
      {
        workspace_uuid: workspace.id,
      }
    );

    if (categoriesError) {
      console.error('Default categories error:', categoriesError);
      // Non-critical, continue
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('Workspace POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
