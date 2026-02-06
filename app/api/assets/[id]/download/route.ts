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

    // 2. Get asset (RLS handles access control)
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('storage_path, name, file_type')
      .eq('id', id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // 3. Generate signed URL with download disposition
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(asset.storage_path, 60, {
        download: asset.name, // This sets the download filename
      });

    if (urlError || !signedUrlData) {
      console.error('Signed URL error:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // 4. Return the signed URL
    return NextResponse.json(
      {
        download_url: signedUrlData.signedUrl,
        filename: asset.name,
        expires_in: 60, // seconds
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Download GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
