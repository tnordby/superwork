-- =============================================
-- FIX WORKSPACE CREATION
-- =============================================
-- Fixes RLS policies and creates workspaces for existing users
-- =============================================

-- First, let's simplify the workspace creation policy to avoid recursion
drop policy if exists "Users can create workspaces" on public.workspaces;

create policy "Users can create workspaces"
  on public.workspaces for insert
  with check ( true );  -- Allow all authenticated users to create workspaces

-- Also ensure the select policy doesn't have recursion issues
drop policy if exists "Users can view workspaces they belong to" on public.workspaces;

create policy "Users can view workspaces they belong to"
  on public.workspaces for select
  using ( auth.uid() = owner_id );

-- Create workspaces for all users who don't have one (using security definer to bypass RLS)
do $$
declare
  user_record record;
  workspace_name text;
begin
  for user_record in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    where not exists (
      select 1 from public.workspaces w
      where w.owner_id = u.id
    )
  loop
    workspace_name := COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email) || '''s Workspace';

    insert into public.workspaces (name, owner_id, type)
    values (workspace_name, user_record.id, 'client');

    raise notice 'Created workspace for user: %', user_record.email;
  end loop;
end $$;

-- Done!
