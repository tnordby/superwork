import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET shares for an asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check asset access
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('user_id')
      .eq('id', id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // 3. Get shares (RLS handles access control)
    const { data: shares, error: sharesError } = await supabase
      .from('asset_shares')
      .select(
        `
        *,
        shared_with_user:profiles!asset_shares_shared_with_user_id_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `
      )
      .eq('asset_id', id);

    if (sharesError) {
      console.error('Shares query error:', sharesError);
      return NextResponse.json(
        { error: 'Failed to fetch shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({ shares: shares || [] }, { status: 200 });
  } catch (error) {
    console.error('Shares GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create a new share
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { user_id: shared_with_user_id, permission_level, expires_at } = body;

    if (!shared_with_user_id || !permission_level) {
      return NextResponse.json(
        { error: 'user_id and permission_level are required' },
        { status: 400 }
      );
    }

    // Validate permission level
    const validPermissions = ['view', 'download', 'edit', 'manage'];
    if (!validPermissions.includes(permission_level)) {
      return NextResponse.json(
        { error: 'Invalid permission level' },
        { status: 400 }
      );
    }

    // 3. Check asset ownership
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('user_id')
      .eq('id', id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (asset.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only asset owner can share' },
        { status: 403 }
      );
    }

    // 4. Check if user exists
    const { data: targetUser, error: userCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', shared_with_user_id)
      .single();

    if (userCheckError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // 5. Create share (upsert to update if already exists)
    const { data: share, error: shareError } = await supabase
      .from('asset_shares')
      .upsert(
        {
          asset_id: id,
          shared_with_user_id,
          shared_by_user_id: user.id,
          permission_level,
          expires_at: expires_at || null,
        },
        {
          onConflict: 'asset_id,shared_with_user_id',
        }
      )
      .select()
      .single();

    if (shareError) {
      console.error('Share creation error:', shareError);
      return NextResponse.json(
        { error: 'Failed to create share' },
        { status: 500 }
      );
    }

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error('Share POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE remove a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get share_id from query params
    const searchParams = request.nextUrl.searchParams;
    const share_id = searchParams.get('share_id');

    if (!share_id) {
      return NextResponse.json(
        { error: 'share_id query parameter required' },
        { status: 400 }
      );
    }

    // 3. Delete share (RLS ensures user owns the asset)
    const { error: deleteError } = await supabase
      .from('asset_shares')
      .delete()
      .eq('id', share_id)
      .eq('asset_id', id);

    if (deleteError) {
      console.error('Share deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete share' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Share removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Share DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
