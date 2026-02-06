import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'shared-assets';

// GET single asset
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

    // 2. Fetch asset (RLS handles access control)
    const { data: asset, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // 3. Get signed URL for download
    const { data: signedUrlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(asset.storage_path, 3600); // 1 hour expiry

    const assetWithUrl = {
      ...asset,
      download_url: signedUrlData?.signedUrl,
    };

    return NextResponse.json({ asset: assetWithUrl }, { status: 200 });
  } catch (error) {
    console.error('Asset GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH update asset
export async function PATCH(
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
    const updateData: any = {};

    // Allowed fields to update
    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.folder !== undefined) updateData.folder = body.folder;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.visibility !== undefined) updateData.visibility = body.visibility;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // 3. Update asset (RLS ensures user can only update their own)
    const { data: asset, error } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Asset update error:', error);
      return NextResponse.json(
        { error: 'Failed to update asset' },
        { status: 500 }
      );
    }

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ asset }, { status: 200 });
  } catch (error) {
    console.error('Asset PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE asset
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

    // 2. Get asset to retrieve storage path
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('storage_path, user_id, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // 3. Check permissions
    let canDelete = asset.user_id === user.id;

    // Check if user is workspace admin/owner
    if (!canDelete && asset.workspace_id) {
      const { data: workspaceOwner } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', asset.workspace_id)
        .single();

      if (workspaceOwner?.owner_id === user.id) {
        canDelete = true;
      }

      if (!canDelete) {
        const { data: member } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', asset.workspace_id)
          .eq('user_id', user.id)
          .single();

        if (member && ['admin', 'owner'].includes(member.role)) {
          canDelete = true;
        }
      }
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // 4. Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([asset.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // 5. Delete from database (RLS handles final permission check)
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Asset delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete asset' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Asset deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Asset DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
