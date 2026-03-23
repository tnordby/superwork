-- Normalize workspace naming:
-- 1) company name first
-- 2) remove duplicated "Workspace Workspace" style suffixes
-- 3) ensure future auto-created workspaces follow same rule

create or replace function public.resolve_workspace_name(
  p_email text,
  p_company_name text,
  p_full_name text
) returns text
language plpgsql
stable
as $$
declare
  base_name text;
begin
  base_name := nullif(trim(coalesce(p_company_name, '')), '');
  if base_name is not null then
    return base_name;
  end if;

  base_name := nullif(trim(coalesce(p_full_name, '')), '');
  if base_name is not null then
    return base_name;
  end if;

  base_name := nullif(split_part(coalesce(p_email, ''), '@', 1), '');
  if base_name is not null then
    return base_name;
  end if;

  return 'Customer';
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_name text;
begin
  workspace_name := public.resolve_workspace_name(
    new.email,
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'full_name'
  );

  insert into public.workspaces (name, owner_id, type)
  values (workspace_name, new.id, 'client')
  on conflict do nothing;

  return new;
end;
$$;

-- Ensure trigger points to the updated function.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill existing workspace names for client workspaces:
-- prefer profile/company metadata; if missing, strip redundant workspace suffix noise.
with owner_details as (
  select
    w.id as workspace_id,
    w.name as current_name,
    u.email,
    coalesce(p.company_name, u.raw_user_meta_data->>'company_name') as company_name,
    coalesce(
      nullif(p.first_name, '') || case when nullif(p.last_name, '') is not null then ' ' || p.last_name else '' end,
      u.raw_user_meta_data->>'full_name'
    ) as full_name
  from public.workspaces w
  left join auth.users u on u.id = w.owner_id
  left join public.profiles p on p.id = w.owner_id
  where w.type = 'client'
)
update public.workspaces w
set name = case
  when od.company_name is not null and trim(od.company_name) <> '' then trim(od.company_name)
  else trim(
    regexp_replace(coalesce(od.current_name, ''), '(\s+workspace)+\s*$', '', 'i')
  )
end
from owner_details od
where w.id = od.workspace_id
  and (
    (od.company_name is not null and trim(od.company_name) <> '' and w.name <> trim(od.company_name))
    or w.name ~* 'workspace\s+workspace\s*$'
    or w.name ~* '\s+workspace\s*$'
  );

