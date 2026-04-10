-- Internal staff (admin, PM, consultant) can read assets, categories, and shares across all client workspaces.
-- Customers remain scoped to workspace membership / ownership / shares (unchanged customer paths).

-- ---------------------------------------------------------------------------
-- public.assets: SELECT
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view assets in their workspaces" on public.assets;

create policy "Users can view assets in their workspaces"
  on public.assets for select
  using (
    auth.uid() = user_id
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
    or public.asset_share_exists_for_user(assets.id)
    or public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant')
  );

-- ---------------------------------------------------------------------------
-- public.asset_categories: SELECT
-- ---------------------------------------------------------------------------
drop policy if exists "Workspace members can view categories" on public.asset_categories;

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
    or public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant')
  );

-- ---------------------------------------------------------------------------
-- public.asset_shares: SELECT (internal tooling; avoids nested assets checks that omit staff)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view shares for assets they can access" on public.asset_shares;

create policy "Users can view shares for assets they can access"
  on public.asset_shares for select
  using (
    (
      public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant')
      and exists (
        select 1 from public.assets
        where assets.id = asset_shares.asset_id
      )
    )
    or exists (
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

-- ---------------------------------------------------------------------------
-- storage.objects: SELECT on shared-assets (signed URLs use the user JWT)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view assets in their workspaces" on storage.objects;

create policy "Users can view assets in their workspaces"
  on storage.objects for select
  using (
    bucket_id = 'shared-assets'
    and (
      exists (
        select 1 from public.assets
        where assets.storage_path = storage.objects.name
          and assets.user_id = auth.uid()
      )
      or exists (
        select 1 from public.assets
        join public.workspace_members on workspace_members.workspace_id = assets.workspace_id
        where assets.storage_path = storage.objects.name
          and workspace_members.user_id = auth.uid()
      )
      or exists (
        select 1 from public.assets
        join public.workspaces on workspaces.id = assets.workspace_id
        where assets.storage_path = storage.objects.name
          and workspaces.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.assets
        join public.asset_shares on asset_shares.asset_id = assets.id
        where assets.storage_path = storage.objects.name
          and asset_shares.shared_with_user_id = auth.uid()
      )
      or (
        public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant')
        and exists (
          select 1 from public.assets a
          where a.storage_path = storage.objects.name
        )
      )
    )
  );
