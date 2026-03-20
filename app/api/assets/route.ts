import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** PostgREST `.or()` splits on commas; LIKE treats `%`/`_` as wildcards — normalize for safe filters. */
function sanitizeAssetSearchInput(raw: string): string {
  return raw
    .replace(/,/g, ' ')
    .replace(/%/g, '')
    .replace(/_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    const workspace_id = searchParams.get('workspace_id');
    const project_id = searchParams.get('project_id');
    const file_type = searchParams.get('file_type');
    const category = searchParams.get('category');
    const folder = searchParams.get('folder');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const page_size = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('page_size') || '50', 10) || 50)
    );

    // 3. Build query (no aggregate count — avoids PostgREST/RLS issues; UI lists current page only)
    let query = supabase.from('assets').select('*').order('created_at', { ascending: false });

    // Apply filters
    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id);
    }

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    if (file_type) {
      query = query.eq('file_type', file_type);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (folder) {
      query = query.eq('folder', folder);
    }

    const searchClean = search ? sanitizeAssetSearchInput(search) : '';
    if (searchClean) {
      query = query.or(`name.ilike.%${searchClean}%,description.ilike.%${searchClean}%`);
    }

    // Apply pagination
    const from = (page - 1) * page_size;
    const to = from + page_size - 1;
    query = query.range(from, to);

    // 4. Execute query (RLS policies handle access control)
    const { data: assets, error } = await query;

    if (error) {
      console.error('Assets query error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch assets',
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    const len = assets?.length ?? 0;
    const has_more = len === page_size;

    // 5. Return response
    return NextResponse.json(
      {
        assets: assets || [],
        total: len,
        page,
        page_size,
        has_more,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Assets GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
