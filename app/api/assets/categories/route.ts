import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ categories: [] }, { status: 200 });
    }

    // 3. Fetch categories (RLS handles access control)
    const { data: categories, error } = await supabase
      .from('asset_categories')
      .select('id, workspace_id, name, description, icon, color, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Asset categories query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch asset categories', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { categories: categories || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Asset categories GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

