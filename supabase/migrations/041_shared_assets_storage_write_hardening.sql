-- Harden shared-assets writes: restrict INSERT to personal prefix or workspace prefix the user may use,
-- plus internal staff (same roles as 040) so consultants can upload into client workspace paths.
-- Extend UPDATE/DELETE so internal staff can maintain objects tied to existing asset rows (parity with SELECT).

-- ---------------------------------------------------------------------------
-- INSERT
-- ---------------------------------------------------------------------------
drop policy if exists "Users can upload assets to their workspaces" on storage.objects;

create policy "Users can upload assets to their workspaces"
  on storage.objects for insert
  with check (
    bucket_id = 'shared-assets'
    and (
      name like (auth.uid()::text || '/%')
      or (
        name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
        and (
          exists (
            select 1
            from public.workspace_members wm
            where wm.user_id = auth.uid()
              and wm.workspace_id = split_part(name, '/', 1)::uuid
          )
          or exists (
            select 1
            from public.workspaces w
            where w.owner_id = auth.uid()
              and w.id = split_part(name, '/', 1)::uuid
          )
          or public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant')
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- UPDATE (metadata / replace)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can update their own assets" on storage.objects;

create policy "Users can update their own assets"
  on storage.objects for update
  using (
    bucket_id = 'shared-assets'
    and (
      exists (
        select 1
        from public.assets
        where assets.storage_path = storage.objects.name
          and assets.user_id = auth.uid()
      )
      or (
        public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant')
        and exists (
          select 1
          from public.assets a
          where a.storage_path = storage.objects.name
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- DELETE
-- ---------------------------------------------------------------------------
drop policy if exists "Users can delete their own assets" on storage.objects;

create policy "Users can delete their own assets"
  on storage.objects for delete
  using (
    bucket_id = 'shared-assets'
    and (
      exists (
        select 1
        from public.assets
        where assets.storage_path = storage.objects.name
          and assets.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.assets
        join public.workspace_members on workspace_members.workspace_id = assets.workspace_id
        where assets.storage_path = storage.objects.name
          and workspace_members.user_id = auth.uid()
          and workspace_members.role in ('admin', 'owner')
      )
      or exists (
        select 1
        from public.assets
        join public.workspaces on workspaces.id = assets.workspace_id
        where assets.storage_path = storage.objects.name
          and workspaces.owner_id = auth.uid()
      )
      or (
        public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant')
        and exists (
          select 1
          from public.assets a
          where a.storage_path = storage.objects.name
        )
      )
    )
  );
