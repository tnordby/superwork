-- Enforce that quote assigned lead users are internal staff.
-- This is a DB-level guard to prevent accidental or malicious assignment of customer users.

create or replace function public.is_internal_staff_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with effective_role as (
    select coalesce(
      (select upr.role::text from public.user_platform_roles upr where upr.user_id = target_user_id),
      (select au.raw_user_meta_data->>'role' from auth.users au where au.id = target_user_id),
      'customer'
    ) as role
  )
  select (select role from effective_role) in ('admin', 'consultant', 'project_manager', 'pm');
$$;

comment on function public.is_internal_staff_user(uuid) is
  'Returns true when target user is internal staff based on user_platform_roles fallback to auth.users metadata role.';

grant execute on function public.is_internal_staff_user(uuid) to authenticated;

create or replace function public.enforce_internal_quote_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_lead_user_id is not null and not public.is_internal_staff_user(new.assigned_lead_user_id) then
    raise exception 'assigned_lead_user_id must be an internal staff user';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_internal_quote_assignee_trigger on public.quotes;

create trigger enforce_internal_quote_assignee_trigger
before insert or update of assigned_lead_user_id on public.quotes
for each row
execute function public.enforce_internal_quote_assignee();

