import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getFileTypeFromMime,
  getFileExtension,
  resolveAssetUploadContentType,
} from '@/types/assets';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const BUCKET_NAME = 'shared-assets';

function parseTagsField(tags: string | null): string[] {
  if (!tags || !tags.trim()) return [];
  try {
    const parsed = JSON.parse(tags) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t) => String(t));
  } catch {
    return [];
  }
}

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

    // 2. Parse form data
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    if (!(fileEntry instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const file = fileEntry;
    const originalName = file instanceof File ? file.name : 'upload';
    const workspaceRaw = formData.get('workspace_id');
    const workspace_id =
      typeof workspaceRaw === 'string' && workspaceRaw.trim() !== ''
        ? workspaceRaw.trim()
        : null;
    const project_id = formData.get('project_id') as string | null;
    const category = formData.get('category') as string | null;
    const folder = formData.get('folder') as string | null;
    const description = formData.get('description') as string | null;
    const tags = formData.get('tags') as string | null;
    const visibility = (formData.get('visibility') as string) || 'workspace';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of 50MB` },
        { status: 400 }
      );
    }

    const contentType = resolveAssetUploadContentType(file, originalName);
    if (!contentType) {
      return NextResponse.json(
        {
          error:
            'Invalid file type. Allowed: PNG, JPG, SVG, WebP, PDF, and font files (TTF, OTF, WOFF, WOFF2). If this is a supported file, try renaming it to include the correct extension.',
        },
        { status: 400 }
      );
    }

    // 4. Verify workspace access if workspace_id provided
    if (workspace_id) {
      const { data: memberCheck } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspace_id)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: ownerCheck } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspace_id)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!memberCheck && !ownerCheck) {
        return NextResponse.json(
          { error: 'Access denied to this workspace' },
          { status: 403 }
        );
      }
    }

    // 5. Generate storage path
    const fileExtension = getFileExtension(originalName);
    const uniqueId = crypto.randomUUID();
    const cleanFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = workspace_id
      ? `${workspace_id}/${uniqueId}_${cleanFileName}`
      : `${user.id}/${uniqueId}_${cleanFileName}`;

    // 6. Upload file to Supabase Storage (ArrayBuffer is reliable in Node route handlers; Content-Type must match bucket allow-list)
    const fileBuffer = await file.arrayBuffer();
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return NextResponse.json(
        {
          error: 'Failed to upload file to storage',
          details: storageError.message,
        },
        { status: 500 }
      );
    }

    // 7. Get public URL (for signed URLs, use createSignedUrl)
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

    // 8. Determine file type
    const fileType = getFileTypeFromMime(contentType);

    // 9. Get user profile for uploaded_by name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    const uploadedBy = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email
      : user.email;

    // 10. Determine uploaded_by_role
    let uploadedByRole = 'client';
    if (workspace_id) {
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData) {
        uploadedByRole = memberData.role;
      }
    }

    // 11. Insert asset record into database
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        user_id: user.id,
        workspace_id: workspace_id || null,
        project_id: project_id || null,
        name: originalName,
        file_type: fileType,
        file_extension: fileExtension,
        file_size: file.size,
        storage_path: storagePath,
        url: publicUrl,
        uploaded_by: uploadedBy,
        uploaded_by_role: uploadedByRole,
        category: category || null,
        folder: folder || null,
        description: description || null,
        tags: parseTagsField(tags),
        visibility: visibility,
        metadata: {},
      })
      .select()
      .single();

    if (assetError) {
      console.error('Database insert error:', assetError);

      // Rollback: Delete uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);

      return NextResponse.json(
        {
          error: 'Failed to create asset record',
          details: assetError.message,
          code: assetError.code,
        },
        { status: 500 }
      );
    }

    // 12. Return success response
    return NextResponse.json(
      {
        success: true,
        asset,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
