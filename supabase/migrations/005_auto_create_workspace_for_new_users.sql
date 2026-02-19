-- =============================================
-- AUTO-CREATE WORKSPACE FOR NEW USERS
-- =============================================
-- Creates a workspace automatically when a user signs up
-- =============================================

-- Function to create workspace for new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspaces (name, owner_id, type)
  values (
    COALESCE(new.raw_user_meta_data->>'full_name', new.email) || '''s Workspace',
    new.id,
    'client'
  );
  return new;
end;
$$;

-- Trigger to run after user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Also create workspaces for any existing users who don't have one
insert into public.workspaces (name, owner_id, type)
select
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) || '''s Workspace' as name,
  u.id as owner_id,
  'client' as type
from auth.users u
where not exists (
  select 1 from public.workspaces w
  where w.owner_id = u.id
)
on conflict do nothing;

-- Done!
