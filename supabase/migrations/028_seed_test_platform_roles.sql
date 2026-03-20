-- Seed/ensure platform roles for local test users.
-- Safe to run multiple times.

with targets as (
  select
    id as user_id,
    email,
    case
      when lower(email) = 'test.pm@superwork.co' then 'project_manager'
      when lower(email) = 'test.consultant@superwork.co' then 'consultant'
      when lower(email) = 'test.admin@superwork.co' then 'admin'
      else null
    end as platform_role
  from auth.users
  where lower(email) in (
    'test.pm@superwork.co',
    'test.consultant@superwork.co',
    'test.admin@superwork.co'
  )
)
insert into public.user_platform_roles (user_id, role, updated_at)
select
  t.user_id,
  t.platform_role,
  timezone('utc'::text, now())
from targets t
where t.platform_role is not null
on conflict (user_id) do update
set
  role = excluded.role,
  updated_at = excluded.updated_at;

-- Keep JWT metadata role in sync for legacy checks / session fallback.
update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role',
  case
    when lower(u.email) = 'test.pm@superwork.co' then 'pm'
    when lower(u.email) = 'test.consultant@superwork.co' then 'consultant'
    when lower(u.email) = 'test.admin@superwork.co' then 'admin'
    else null
  end
)
where lower(u.email) in (
  'test.pm@superwork.co',
  'test.consultant@superwork.co',
  'test.admin@superwork.co'
);

