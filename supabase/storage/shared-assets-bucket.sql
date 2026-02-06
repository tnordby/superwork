-- =============================================
-- SUPABASE STORAGE BUCKET SETUP - REFERENCE ONLY
-- =============================================
-- ⚠️ WARNING: Storage policies CANNOT be created via SQL Editor!
-- ⚠️ You will get error: "must be owner of table objects"
--
-- Instead, follow the guide in STORAGE_SETUP_GUIDE.md
-- This file is kept for reference only.
-- =============================================

-- =============================================
-- 1. CREATE STORAGE BUCKET
-- =============================================
-- Run this in Supabase Dashboard -> Storage -> Policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shared-assets',
  'shared-assets',
  false, -- Private bucket, require authentication
  52428800, -- 50MB max file size
  array[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/webp',
    'application/pdf',
    'font/ttf',
    'font/otf',
    'font/woff',
    'font/woff2',
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/font-woff',
    'application/font-woff2'
  ]
)
on conflict (id) do nothing;

-- =============================================
-- 2. STORAGE RLS POLICIES
-- =============================================

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- =============================================
-- POLICY: Users can view assets they have access to
-- =============================================
create policy "Users can view assets in their workspaces"
on storage.objects for select
using (
  bucket_id = 'shared-assets'
  and (
    -- Check if user owns the asset in the database
    exists (
      select 1 from public.assets
      where assets.storage_path = storage.objects.name
      and assets.user_id = auth.uid()
    )
    -- Or check if user is in the workspace
    or exists (
      select 1 from public.assets
      join public.workspace_members on workspace_members.workspace_id = assets.workspace_id
      where assets.storage_path = storage.objects.name
      and workspace_members.user_id = auth.uid()
    )
    -- Or check if user is workspace owner
    or exists (
      select 1 from public.assets
      join public.workspaces on workspaces.id = assets.workspace_id
      where assets.storage_path = storage.objects.name
      and workspaces.owner_id = auth.uid()
    )
    -- Or check if asset is shared with user
    or exists (
      select 1 from public.assets
      join public.asset_shares on asset_shares.asset_id = assets.id
      where assets.storage_path = storage.objects.name
      and asset_shares.shared_with_user_id = auth.uid()
    )
  )
);

-- =============================================
-- POLICY: Users can upload assets to their workspaces
-- =============================================
create policy "Users can upload assets to their workspaces"
on storage.objects for insert
with check (
  bucket_id = 'shared-assets'
  and (
    -- Allow upload if user is authenticated
    auth.role() = 'authenticated'
  )
);

-- =============================================
-- POLICY: Users can update their own assets
-- =============================================
create policy "Users can update their own assets"
on storage.objects for update
using (
  bucket_id = 'shared-assets'
  and (
    exists (
      select 1 from public.assets
      where assets.storage_path = storage.objects.name
      and assets.user_id = auth.uid()
    )
  )
);

-- =============================================
-- POLICY: Users can delete their own assets
-- =============================================
create policy "Users can delete their own assets"
on storage.objects for delete
using (
  bucket_id = 'shared-assets'
  and (
    -- User owns the asset
    exists (
      select 1 from public.assets
      where assets.storage_path = storage.objects.name
      and assets.user_id = auth.uid()
    )
    -- Or user is workspace admin
    or exists (
      select 1 from public.assets
      join public.workspace_members on workspace_members.workspace_id = assets.workspace_id
      where assets.storage_path = storage.objects.name
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'owner')
    )
    -- Or user is workspace owner
    or exists (
      select 1 from public.assets
      join public.workspaces on workspaces.id = assets.workspace_id
      where assets.storage_path = storage.objects.name
      and workspaces.owner_id = auth.uid()
    )
  )
);

-- =============================================
-- 3. HELPER FUNCTIONS
-- =============================================

-- Function to generate storage path for assets
create or replace function public.generate_asset_storage_path(
  workspace_uuid uuid,
  file_name text
)
returns text
language plpgsql
as $$
declare
  clean_name text;
  unique_id text;
begin
  -- Clean filename (remove special chars, spaces)
  clean_name := regexp_replace(file_name, '[^a-zA-Z0-9._-]', '_', 'g');

  -- Generate unique ID
  unique_id := gen_random_uuid()::text;

  -- Return path: workspace_id/unique_id_filename
  return workspace_uuid::text || '/' || unique_id || '_' || clean_name;
end;
$$;

-- Function to get signed URL for asset download
create or replace function public.get_asset_download_url(
  asset_uuid uuid,
  expires_in_seconds integer default 3600
)
returns text
language plpgsql
security definer
as $$
declare
  storage_path_var text;
  download_url text;
begin
  -- Get storage path from asset
  select storage_path into storage_path_var
  from public.assets
  where id = asset_uuid
  and (
    user_id = auth.uid()
    or exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = assets.workspace_id
      and workspace_members.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspaces
      where workspaces.id = assets.workspace_id
      and workspaces.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.asset_shares
      where asset_shares.asset_id = assets.id
      and asset_shares.shared_with_user_id = auth.uid()
    )
  );

  if storage_path_var is null then
    raise exception 'Asset not found or access denied';
  end if;

  -- Note: In production, you would generate signed URL via Supabase Storage API
  -- This is a placeholder for the client-side implementation
  return storage_path_var;
end;
$$;

-- =============================================
-- SUCCESS!
-- =============================================
-- Storage bucket and policies are configured:
-- ✓ Private bucket with 50MB limit
-- ✓ Allowed file types: images, PDFs, fonts
-- ✓ RLS policies for secure access
-- ✓ Helper functions for path generation
--
-- Next: Implement API routes for file upload
-- =============================================
