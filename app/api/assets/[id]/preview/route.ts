import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'shared-assets';

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

    // 2. Get asset row (RLS handles access control)
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('storage_path, file_type')
      .eq('id', id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (asset.file_type !== 'image') {
      return NextResponse.json(
        { error: 'Asset preview is only supported for images' },
        { status: 400 }
      );
    }

    // 3. Generate signed image URL for preview
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(asset.storage_path, 3600);

    if (urlError || !signedUrlData) {
      return NextResponse.json(
        { error: 'Failed to generate preview URL' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { preview_url: signedUrlData.signedUrl, expires_in: 3600 },
      { status: 200 }
    );
  } catch (error) {
    console.error('Asset preview GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

