-- =============================================
-- FIX PROJECTS RLS POLICIES
-- =============================================
-- Allow users to see projects by user_id OR workspace_id
-- Handles both legacy projects and workspace-based projects
-- =============================================

-- Drop existing policies
drop policy if exists "Users can view projects in their workspace" on public.projects;
drop policy if exists "Users can create projects in their workspace" on public.projects;
drop policy if exists "Users can update projects in their workspace" on public.projects;
drop policy if exists "Users can delete projects in their workspace" on public.projects;
drop policy if exists "Users can view own projects and workspace projects" on public.projects;

-- SELECT policy: View projects by user_id OR workspace ownership
create policy "Users can view own projects and workspace projects"
  on public.projects for select
  using (
    -- User is the project owner
    auth.uid() = user_id
    -- Or project belongs to user's workspace
    or (
      workspace_id is not null
      and workspace_id in (
        select id from public.workspaces where owner_id = auth.uid()
      )
    )
  );

-- INSERT policy: Create projects with user_id and optional workspace_id
create policy "Users can create own projects"
  on public.projects for insert
  with check (
    -- Must be the project owner
    auth.uid() = user_id
    -- If workspace_id is provided, must own that workspace
    and (
      workspace_id is null
      or workspace_id in (
        select id from public.workspaces where owner_id = auth.uid()
      )
    )
  );

-- UPDATE policy: Update own projects or workspace projects
create policy "Users can update own projects"
  on public.projects for update
  using (
    -- User is the project owner
    auth.uid() = user_id
    -- Or project belongs to user's workspace
    or (
      workspace_id is not null
      and workspace_id in (
        select id from public.workspaces where owner_id = auth.uid()
      )
    )
  );

-- DELETE policy: Delete own projects or workspace projects
create policy "Users can delete own projects"
  on public.projects for delete
  using (
    -- User is the project owner
    auth.uid() = user_id
    -- Or project belongs to user's workspace
    or (
      workspace_id is not null
      and workspace_id in (
        select id from public.workspaces where owner_id = auth.uid()
      )
    )
  );

-- Done!
