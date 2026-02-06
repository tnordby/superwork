# Supabase Storage Setup Guide - Shared Assets

## Important Note

Storage bucket policies **cannot be created via SQL Editor**. You must use the Supabase Dashboard UI to create them.

---

## Step 1: Create Storage Bucket

### Option A: Via Dashboard (Recommended)

1. Go to **Supabase Dashboard** > **Storage**
2. Click **New bucket**
3. Configure:
   - **Name**: `shared-assets`
   - **Public**: `OFF` (private bucket)
   - **File size limit**: `52428800` (50MB in bytes)
   - **Allowed MIME types**: Leave empty for now (we'll validate on upload)
4. Click **Create bucket**

### Option B: Via SQL Editor

Run this in the SQL Editor:

```sql
insert into storage.buckets (id, name, public, file_size_limit)
values (
  'shared-assets',
  'shared-assets',
  false,
  52428800
)
on conflict (id) do nothing;
```

---

## Step 2: Create Storage Policies via Dashboard

Go to **Storage** > **Policies** > Select `shared-assets` bucket

### Policy 1: Select (View/Download)

1. Click **New Policy**
2. Select **For full customization** (or "Get started quickly" > "Select")
3. Configure:
   - **Policy name**: `Users can view assets in their workspaces`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `authenticated`
   - **USING expression**:

```sql
(bucket_id = 'shared-assets'::text)
AND (
  -- User owns the asset
  EXISTS (
    SELECT 1 FROM public.assets
    WHERE (assets.storage_path = objects.name)
    AND (assets.user_id = auth.uid())
  )
  -- User is in the workspace
  OR EXISTS (
    SELECT 1 FROM public.assets
    JOIN public.workspace_members
      ON workspace_members.workspace_id = assets.workspace_id
    WHERE (assets.storage_path = objects.name)
    AND (workspace_members.user_id = auth.uid())
  )
  -- User is workspace owner
  OR EXISTS (
    SELECT 1 FROM public.assets
    JOIN public.workspaces
      ON workspaces.id = assets.workspace_id
    WHERE (assets.storage_path = objects.name)
    AND (workspaces.owner_id = auth.uid())
  )
  -- Asset is shared with user
  OR EXISTS (
    SELECT 1 FROM public.assets
    JOIN public.asset_shares
      ON asset_shares.asset_id = assets.id
    WHERE (assets.storage_path = objects.name)
    AND (asset_shares.shared_with_user_id = auth.uid())
  )
)
```

4. Click **Review** > **Save policy**

### Policy 2: Insert (Upload)

1. Click **New Policy**
2. Select **For full customization**
3. Configure:
   - **Policy name**: `Users can upload assets`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **WITH CHECK expression**:

```sql
(bucket_id = 'shared-assets'::text)
AND (auth.role() = 'authenticated'::text)
```

4. Click **Review** > **Save policy**

### Policy 3: Update

1. Click **New Policy**
2. Select **For full customization**
3. Configure:
   - **Policy name**: `Users can update their own assets`
   - **Allowed operation**: `UPDATE`
   - **Target roles**: `authenticated`
   - **USING expression**:

```sql
(bucket_id = 'shared-assets'::text)
AND EXISTS (
  SELECT 1 FROM public.assets
  WHERE (assets.storage_path = objects.name)
  AND (assets.user_id = auth.uid())
)
```

4. Click **Review** > **Save policy**

### Policy 4: Delete

1. Click **New Policy**
2. Select **For full customization**
3. Configure:
   - **Policy name**: `Users and admins can delete assets`
   - **Allowed operation**: `DELETE`
   - **Target roles**: `authenticated`
   - **USING expression**:

```sql
(bucket_id = 'shared-assets'::text)
AND (
  -- User owns the asset
  EXISTS (
    SELECT 1 FROM public.assets
    WHERE (assets.storage_path = objects.name)
    AND (assets.user_id = auth.uid())
  )
  -- User is workspace admin
  OR EXISTS (
    SELECT 1 FROM public.assets
    JOIN public.workspace_members
      ON workspace_members.workspace_id = assets.workspace_id
    WHERE (assets.storage_path = objects.name)
    AND (workspace_members.user_id = auth.uid())
    AND (workspace_members.role IN ('admin', 'owner'))
  )
  -- User is workspace owner
  OR EXISTS (
    SELECT 1 FROM public.assets
    JOIN public.workspaces
      ON workspaces.id = assets.workspace_id
    WHERE (assets.storage_path = objects.name)
    AND (workspaces.owner_id = auth.uid())
  )
)
```

4. Click **Review** > **Save policy**

---

## Step 3: Verify Setup

### Test Bucket Creation

Run this query to verify the bucket exists:

```sql
SELECT * FROM storage.buckets WHERE id = 'shared-assets';
```

You should see your bucket with:
- `id`: `shared-assets`
- `name`: `shared-assets`
- `public`: `false`
- `file_size_limit`: `52428800`

### Test Policies

Go to **Storage** > **Policies** and verify you see:
- ✅ Users can view assets in their workspaces (SELECT)
- ✅ Users can upload assets (INSERT)
- ✅ Users can update their own assets (UPDATE)
- ✅ Users and admins can delete assets (DELETE)

---

## Step 4: Test Upload (Optional)

You can test manually in the Dashboard:

1. Go to **Storage** > `shared-assets` bucket
2. Try uploading a test file
3. Verify the file appears

---

## Troubleshooting

### Error: "new row violates row-level security policy"

This means your RLS policies are blocking the operation. Check:
- User is authenticated
- Asset record exists in the `assets` table with matching `storage_path`
- User has proper permissions (owner, workspace member, or share access)

### Error: "Policy already exists"

If you see this when creating policies, it means a policy with that name already exists. Either:
- Delete the existing policy first
- Use a different policy name

### Cannot upload files through API

Make sure:
- Storage bucket exists
- INSERT policy is created
- User is authenticated
- File size is under 50MB
- CORS is configured if uploading from web app

---

## Summary

After completing these steps, you should have:
- ✅ `shared-assets` bucket created (private, 50MB limit)
- ✅ SELECT policy for viewing assets
- ✅ INSERT policy for uploading assets
- ✅ UPDATE policy for modifying assets
- ✅ DELETE policy for removing assets

Your storage is now ready for the Shared Asset Library feature!
