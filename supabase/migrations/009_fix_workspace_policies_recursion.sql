-- =============================================
-- FIX WORKSPACE POLICIES CIRCULAR RECURSION
-- =============================================
-- Removes circular dependency between workspaces and workspace_members policies
-- =============================================

-- Drop the problematic workspace_members SELECT policy
drop policy if exists "Users can view members in their workspaces" on public.workspace_members;

-- Create a simpler policy that doesn't reference workspaces table
-- This breaks the circular dependency
create policy "Users can view members in their workspaces"
  on public.workspace_members for select
  using (
    -- User can see members if they are the member themselves
    user_id = auth.uid()
    -- Or if they are in the same workspace (checked via direct workspace_id match)
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- Also simplify the workspace policy to avoid deep nesting
drop policy if exists "Users can view workspaces they belong to" on public.workspaces;

create policy "Users can view workspaces they belong to"
  on public.workspaces for select
  using (
    -- User is the owner
    auth.uid() = owner_id
    -- Or user is a member (simple check without recursion)
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id
      and wm.user_id = auth.uid()
    )
  );

-- Fix the workspace_members management policy to avoid recursion
drop policy if exists "Workspace owners and admins can manage members" on public.workspace_members;

create policy "Workspace owners and admins can manage members"
  on public.workspace_members for all
  using (
    -- Check if user is workspace owner (direct check on workspaces table using owner_id)
    workspace_id in (
      select id from public.workspaces
      where owner_id = auth.uid()
    )
    -- Or if user is an admin in the workspace
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('admin', 'owner')
    )
  );

-- Done!
