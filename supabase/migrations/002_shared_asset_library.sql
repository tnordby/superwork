-- =============================================
-- SHARED ASSET LIBRARY MIGRATION
-- =============================================
-- Adds workspace support and asset sharing functionality
-- =============================================

-- =============================================
-- PHASE 1: CREATE ALL TABLES
-- =============================================

-- 1. WORKSPACES TABLE
create table if not exists public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references auth.users on delete cascade not null,
  type text not null default 'client', -- 'client', 'agency', 'internal'
  settings jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.workspaces is 'Workspaces for grouping clients and consultants';

-- 2. WORKSPACE_MEMBERS TABLE
create table if not exists public.workspace_members (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'member', -- 'owner', 'admin', 'consultant', 'client', 'viewer'
  invited_by uuid references auth.users on delete set null,
  invited_at timestamp with time zone default timezone('utc'::text, now()) not null,
  accepted_at timestamp with time zone,
  unique(workspace_id, user_id)
);

comment on table public.workspace_members is 'Members of workspaces with roles';

-- 3. ASSET CATEGORIES TABLE
create table if not exists public.asset_categories (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces on delete cascade not null,
  name text not null,
  description text,
  icon text, -- Icon name or emoji
  color text, -- Hex color code
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workspace_id, name)
);

comment on table public.asset_categories is 'Asset categories for organization';

-- 4. ASSET_SHARES TABLE
create table if not exists public.asset_shares (
  id uuid default gen_random_uuid() primary key,
  asset_id uuid references public.assets on delete cascade not null,
  shared_with_user_id uuid references auth.users on delete cascade not null,
  shared_by_user_id uuid references auth.users on delete set null not null,
  permission_level text not null default 'view', -- 'view', 'download', 'edit', 'manage'
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(asset_id, shared_with_user_id)
);

comment on table public.asset_shares is 'Individual asset sharing permissions';

-- 5. UPDATE ASSETS TABLE - Add new columns
alter table public.assets add column if not exists workspace_id uuid references public.workspaces on delete cascade;
alter table public.assets add column if not exists category text;
alter table public.assets add column if not exists folder text;
alter table public.assets add column if not exists description text;
alter table public.assets add column if not exists metadata jsonb default '{}';
alter table public.assets add column if not exists tags text[] default array[]::text[];
alter table public.assets add column if not exists visibility text default 'workspace'; -- 'private', 'workspace', 'public'
alter table public.assets add column if not exists uploaded_by_role text; -- 'client', 'consultant', 'admin'
alter table public.assets add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

comment on table public.assets is 'Shared asset library for files and documents';

-- 6. UPDATE PROJECTS TABLE - Add workspace_id
alter table public.projects add column if not exists workspace_id uuid references public.workspaces on delete set null;

-- =============================================
-- PHASE 2: CREATE INDEXES
-- =============================================

create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists asset_categories_workspace_id_idx on public.asset_categories(workspace_id);
create index if not exists asset_shares_asset_id_idx on public.asset_shares(asset_id);
create index if not exists asset_shares_shared_with_user_id_idx on public.asset_shares(shared_with_user_id);
create index if not exists asset_shares_expires_at_idx on public.asset_shares(expires_at);
create index if not exists assets_workspace_id_idx on public.assets(workspace_id);
create index if not exists assets_category_idx on public.assets(category);
create index if not exists assets_folder_idx on public.assets(folder);
create index if not exists assets_visibility_idx on public.assets(visibility);
create index if not exists assets_tags_idx on public.assets using gin(tags);
create index if not exists projects_workspace_id_idx on public.projects(workspace_id);

-- =============================================
-- PHASE 3: ENABLE RLS ON ALL TABLES
-- =============================================

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.asset_categories enable row level security;
alter table public.asset_shares enable row level security;

-- =============================================
-- PHASE 4: DROP OLD RLS POLICIES
-- =============================================

drop policy if exists "Users can view own assets" on public.assets;
drop policy if exists "Users can create own assets" on public.assets;
drop policy if exists "Users can delete own assets" on public.assets;
drop policy if exists "Users can view own projects" on public.projects;

-- =============================================
-- PHASE 5: CREATE RLS POLICIES
-- =============================================

-- WORKSPACES POLICIES
create policy "Users can view workspaces they belong to"
  on public.workspaces for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = workspaces.id
      and workspace_members.user_id = auth.uid()
    )
  );

create policy "Workspace owners can update their workspace"
  on public.workspaces for update
  using ( auth.uid() = owner_id );

create policy "Users can create workspaces"
  on public.workspaces for insert
  with check ( auth.uid() = owner_id );

-- WORKSPACE_MEMBERS POLICIES
create policy "Users can view members in their workspaces"
  on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = workspace_members.workspace_id
      and (
        workspaces.owner_id = auth.uid()
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = workspaces.id
          and wm.user_id = auth.uid()
        )
      )
    )
  );

create policy "Workspace owners and admins can manage members"
  on public.workspace_members for all
  using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = workspace_members.workspace_id
      and workspaces.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'owner')
    )
  );

-- ASSET_CATEGORIES POLICIES
create policy "Workspace members can view categories"
  on public.asset_categories for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = asset_categories.workspace_id
      and workspace_members.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspaces
      where workspaces.id = asset_categories.workspace_id
      and workspaces.owner_id = auth.uid()
    )
  );

create policy "Workspace owners and admins can manage categories"
  on public.asset_categories for all
  using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = asset_categories.workspace_id
      and workspaces.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = asset_categories.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'owner')
    )
  );

-- Avoid RLS recursion: assets policy must not scan asset_shares directly (asset_shares policies read assets).
create or replace function public.asset_share_exists_for_user(p_asset_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.asset_shares as s
    where s.asset_id = p_asset_id
      and s.shared_with_user_id = (select auth.uid())
  );
$$;

revoke all on function public.asset_share_exists_for_user(uuid) from public;
grant execute on function public.asset_share_exists_for_user(uuid) to authenticated;
grant execute on function public.asset_share_exists_for_user(uuid) to service_role;

-- ASSETS POLICIES
create policy "Users can view assets in their workspaces"
  on public.assets for select
  using (
    -- Own assets
    auth.uid() = user_id
    -- Or workspace assets where user is a member
    or (
      workspace_id is not null
      and (
        exists (
          select 1 from public.workspace_members
          where workspace_members.workspace_id = assets.workspace_id
          and workspace_members.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspaces
          where workspaces.id = assets.workspace_id
          and workspaces.owner_id = auth.uid()
        )
      )
    )
    -- Or assets shared with user (via helper to break assets <-> asset_shares RLS cycle)
    or public.asset_share_exists_for_user(assets.id)
  );

create policy "Users can create assets in their workspaces"
  on public.assets for insert
  with check (
    auth.uid() = user_id
    and (
      workspace_id is null
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
    )
  );

create policy "Users can update their own assets"
  on public.assets for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own assets"
  on public.assets for delete
  using ( auth.uid() = user_id );

create policy "Workspace admins can delete workspace assets"
  on public.assets for delete
  using (
    workspace_id is not null
    and (
      exists (
        select 1 from public.workspaces
        where workspaces.id = assets.workspace_id
        and workspaces.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.workspace_members
        where workspace_members.workspace_id = assets.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('admin', 'owner')
      )
    )
  );

-- ASSET_SHARES POLICIES
create policy "Users can view shares for assets they can access"
  on public.asset_shares for select
  using (
    exists (
      select 1 from public.assets
      where assets.id = asset_shares.asset_id
      and (
        assets.user_id = auth.uid()
        or asset_shares.shared_with_user_id = auth.uid()
        or exists (
          select 1 from public.workspace_members
          where workspace_members.workspace_id = assets.workspace_id
          and workspace_members.user_id = auth.uid()
          and workspace_members.role in ('admin', 'owner')
        )
      )
    )
  );

create policy "Asset owners can create shares"
  on public.asset_shares for insert
  with check (
    exists (
      select 1 from public.assets
      where assets.id = asset_shares.asset_id
      and assets.user_id = auth.uid()
    )
  );

create policy "Asset owners can delete shares"
  on public.asset_shares for delete
  using (
    exists (
      select 1 from public.assets
      where assets.id = asset_shares.asset_id
      and assets.user_id = auth.uid()
    )
  );

-- PROJECTS POLICIES
create policy "Users can view own projects and workspace projects"
  on public.projects for select
  using (
    auth.uid() = user_id
    or (
      workspace_id is not null
      and (
        exists (
          select 1 from public.workspace_members
          where workspace_members.workspace_id = projects.workspace_id
          and workspace_members.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspaces
          where workspaces.id = projects.workspace_id
          and workspaces.owner_id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- PHASE 6: CREATE TRIGGERS
-- =============================================

create trigger set_updated_at before update on public.workspaces
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_updated_at on public.assets;
create trigger set_updated_at before update on public.assets
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- PHASE 7: GRANT PERMISSIONS
-- =============================================

grant all on public.workspaces to authenticated;
grant all on public.workspace_members to authenticated;
grant all on public.asset_categories to authenticated;
grant all on public.asset_shares to authenticated;

-- =============================================
-- PHASE 8: HELPER FUNCTIONS
-- =============================================

create or replace function public.create_default_asset_categories(workspace_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.asset_categories (workspace_id, name, description, icon, color)
  values
    (workspace_uuid, 'Brand Assets', 'Logos, brand colors, and identity files', '🎨', '#FF6B6B'),
    (workspace_uuid, 'Documents', 'PDFs, guidelines, and documentation', '📄', '#4ECDC4'),
    (workspace_uuid, 'Fonts', 'Typography files for design work', '🔤', '#95E1D3'),
    (workspace_uuid, 'Images', 'Photos, graphics, and visual assets', '🖼️', '#F7DC6F'),
    (workspace_uuid, 'Marketing', 'Campaign materials and creatives', '📱', '#BB8FCE')
  on conflict (workspace_id, name) do nothing;
end;
$$;

-- =============================================
-- SUCCESS!
-- =============================================
-- Shared Asset Library schema is now complete:
-- ✓ Workspaces for grouping clients and consultants
-- ✓ Workspace members with role-based access
-- ✓ Asset categories for organization
-- ✓ Enhanced assets table with sharing capabilities
-- ✓ Asset shares for granular permissions
-- ✓ Updated RLS policies for secure access
-- ✓ Proper indexes for performance
-- ✓ Integration with existing projects
--
-- Next steps:
-- 1. Set up Supabase Storage bucket
-- 2. Create API routes for file upload
-- 3. Build frontend UI
-- =============================================
