# Shared Asset Library - Deployment Guide

## Overview

This guide will walk you through deploying the Shared Asset Library feature that enables clients and consultants to upload, manage, and share assets like brand logos, PDFs, and fonts.

---

## Prerequisites

- Supabase project set up and configured
- Database connection established
- Environment variables configured in `.env.local`

---

## Step 1: Run Database Migrations

### 1.1 Run the Schema Migration

Open your Supabase SQL Editor and run the migration file:

```bash
# Location: /supabase/migrations/002_shared_asset_library.sql
```

**In Supabase Dashboard:**
1. Go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase/migrations/002_shared_asset_library.sql`
4. Click **Run**

This will create:
- `workspaces` table
- `workspace_members` table
- `asset_categories` table
- Updates to the `assets` table with new columns
- New RLS policies for secure access
- Helper functions for asset management

### 1.2 Verify Migration Success

Run this query to verify tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('workspaces', 'workspace_members', 'asset_categories', 'assets');
```

You should see all 4 tables listed.

---

## Step 2: Set Up Supabase Storage

### Important: Storage policies CANNOT be created via SQL Editor

You must use the Supabase Dashboard UI to create storage policies. See the detailed guide:

```
/supabase/storage/STORAGE_SETUP_GUIDE.md
```

### Quick Setup Steps:

**2.1 Create Storage Bucket**

In Supabase Dashboard:
1. Go to **Storage** > **New bucket**
2. Name: `shared-assets`
3. Public: `OFF`
4. File size limit: `52428800` (50MB)
5. Click **Create bucket**

**2.2 Create Storage Policies via Dashboard**

Go to **Storage** > **Policies** > `shared-assets` bucket

Create 4 policies:
1. **SELECT** - "Users can view assets in their workspaces"
2. **INSERT** - "Users can upload assets"
3. **UPDATE** - "Users can update their own assets"
4. **DELETE** - "Users and admins can delete assets"

See `STORAGE_SETUP_GUIDE.md` for the complete policy SQL expressions.

### 2.3 Verify Storage Setup

1. Go to **Storage** > **shared-assets** bucket
2. Try uploading a test file manually
3. Verify the file appears in the bucket

---

## Step 3: Verify API Routes

No deployment needed - Next.js API routes are automatically available.

**Verify the following routes exist:**
- `/api/assets` - List assets
- `/api/assets/upload` - Upload assets
- `/api/assets/[id]` - Get/update/delete individual asset
- `/api/assets/[id]/download` - Download asset
- `/api/assets/[id]/share` - Share asset
- `/api/workspaces` - Manage workspaces

---

## Step 4: Install Dependencies (if needed)

The implementation uses existing dependencies. Verify these are installed:

```bash
npm install
```

Key dependencies:
- `@supabase/ssr` - Supabase SSR client
- `lucide-react` - Icons
- `react` and `next` - Already installed

---

## Step 5: Environment Variables

Verify your `.env.local` has the required Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Step 6: Test the Implementation

### 6.1 Create a Test Workspace

1. Log in to your application
2. Open the browser console
3. Run this query in Supabase SQL Editor to create a test workspace:

```sql
INSERT INTO public.workspaces (name, owner_id, type)
VALUES ('Test Client Workspace', 'your-user-id-here', 'client')
RETURNING *;
```

Replace `your-user-id-here` with your actual user ID (get it from `auth.users` table or from the browser console after logging in).

### 6.2 Test Asset Upload

1. Navigate to `/assets` in your app
2. Select the workspace from the dropdown (if you created one)
3. Click the upload area
4. Select a test file (image, PDF, or font)
5. Verify:
   - Upload progress shows
   - File appears in the asset grid
   - File metadata is correct

### 6.3 Test Asset Download

1. Click the **Download** button on an asset
2. Verify the file downloads correctly

### 6.4 Test Asset Sharing

1. Click the **Share** button (blue icon) on an asset
2. Enter an email address of another user
3. Select permission level (View/Download/Edit/Manage)
4. Click **Share**
5. Verify the share appears in the list

### 6.5 Test Asset Deletion

1. Click the **Delete** button (red trash icon) on an asset
2. Confirm the deletion
3. Verify:
   - Asset is removed from the UI
   - Asset is removed from the database
   - File is removed from Storage bucket

---

## Step 7: Optional - Create Default Categories

If you want predefined categories for your workspace:

```sql
SELECT create_default_asset_categories('workspace-id-here');
```

This creates default categories:
- Brand Assets
- Documents
- Fonts
- Images
- Marketing

---

## Troubleshooting

### Issue: Upload fails with "Failed to upload file to storage"

**Solution:**
- Verify the `shared-assets` bucket exists
- Check storage policies are correctly set
- Verify file size is under 50MB
- Check file type is allowed (images, PDFs, fonts)

### Issue: "Asset not found" when viewing assets

**Solution:**
- Verify RLS policies are correctly set on the `assets` table
- Check that you're authenticated (run `supabase.auth.getUser()` in console)
- Verify workspace membership if filtering by workspace

### Issue: Cannot share assets

**Solution:**
- Verify the `asset_shares` table exists
- Check RLS policies on `asset_shares` table
- Ensure the target user exists in the database
- Currently, sharing requires the user_id - you may need to create a lookup endpoint for email-to-user_id

### Issue: Download URLs not working

**Solution:**
- Verify storage policies allow reading
- Check that signed URLs are being generated (expires in 60 seconds by default)
- Ensure the storage path in the database matches the actual file path

---

## Production Considerations

### Security Checklist

- ✅ RLS policies are enabled on all tables
- ✅ Storage bucket is private (not public)
- ✅ File types are validated on upload
- ✅ File size limits are enforced (50MB)
- ✅ Authentication is required for all operations
- ✅ User can only delete their own assets (unless admin)

### Performance Optimizations

1. **Enable Database Indexes** (already created in migration):
   - `assets_workspace_id_idx`
   - `assets_category_idx`
   - `assets_tags_idx` (GIN index for array search)

2. **Enable Supabase Realtime** (optional):
   ```sql
   alter publication supabase_realtime add table public.assets;
   ```
   This allows real-time updates when assets are added/removed.

3. **CDN Configuration**:
   - Consider using a CDN for frequently accessed assets
   - Configure Supabase Storage CDN settings in dashboard

### Monitoring

1. **Track Storage Usage**:
   - Go to Supabase Dashboard > Storage
   - Monitor bucket size and file count

2. **Monitor Database Size**:
   - Go to Supabase Dashboard > Database > Usage
   - Check table sizes and query performance

3. **Set Up Error Tracking**:
   - Add error logging service (e.g., Sentry)
   - Monitor API route failures

---

## Feature Enhancements (Future)

Potential improvements you can add:

1. **Drag-and-Drop Upload**:
   - Add `onDrop` handler to upload area
   - Use `react-dropzone` library

2. **Image Previews**:
   - Generate thumbnails on upload
   - Display image previews in grid

3. **Bulk Operations**:
   - Select multiple assets
   - Bulk delete, move, or tag

4. **Asset Versioning**:
   - Track asset version history
   - Allow reverting to previous versions

5. **Advanced Search**:
   - Full-text search across asset names and descriptions
   - Filter by multiple criteria simultaneously

6. **Activity Log**:
   - Track who uploaded/downloaded assets
   - Show recent activity feed

7. **Email Notifications**:
   - Notify users when assets are shared with them
   - Send digest emails of new assets

---

## API Reference

### POST /api/assets/upload

Upload a new asset.

**Request:**
```typescript
FormData {
  file: File
  workspace_id?: string
  project_id?: string
  category?: string
  folder?: string
  description?: string
  tags?: string (JSON array)
  visibility?: 'private' | 'workspace' | 'public'
}
```

**Response:**
```typescript
{
  success: boolean
  asset?: Asset
  error?: string
}
```

### GET /api/assets

List assets with optional filters.

**Query Parameters:**
- `workspace_id` - Filter by workspace
- `project_id` - Filter by project
- `file_type` - Filter by file type
- `category` - Filter by category
- `search` - Search in name and description
- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 50)

**Response:**
```typescript
{
  assets: Asset[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}
```

### GET /api/assets/[id]

Get a single asset with signed download URL.

**Response:**
```typescript
{
  asset: Asset & { download_url: string }
}
```

### PATCH /api/assets/[id]

Update asset metadata.

**Request:**
```typescript
{
  name?: string
  category?: string
  folder?: string
  description?: string
  tags?: string[]
  visibility?: string
}
```

### DELETE /api/assets/[id]

Delete an asset (file and database record).

### GET /api/assets/[id]/download

Get a signed download URL for an asset.

**Response:**
```typescript
{
  download_url: string
  filename: string
  expires_in: number
}
```

### GET /api/assets/[id]/share

List users who have access to an asset.

### POST /api/assets/[id]/share

Share an asset with a user.

**Request:**
```typescript
{
  user_id: string
  permission_level: 'view' | 'download' | 'edit' | 'manage'
  expires_at?: string
}
```

### DELETE /api/assets/[id]/share

Remove a user's access to an asset.

**Query Parameters:**
- `share_id` - ID of the share to remove

---

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs in Dashboard > Logs
3. Verify database and storage policies
4. Review the API route responses

---

## Summary

You've successfully deployed the Shared Asset Library!

**What's been created:**
- ✅ Database schema with workspaces and asset sharing
- ✅ Supabase Storage bucket for file uploads
- ✅ API routes for asset management
- ✅ Frontend UI with upload, download, and sharing
- ✅ RLS policies for secure access control

**Next steps:**
1. Create workspaces for your clients
2. Invite team members to workspaces
3. Start uploading and sharing assets!
