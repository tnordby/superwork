-- Canonical platform role per user (optional row; JWT metadata used as fallback in app + SQL helper).

create table if not exists public.user_platform_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null
    check (role in ('customer', 'consultant', 'project_manager', 'admin')),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.user_platform_roles is 'Platform-wide role; overrides auth user_metadata.role when set.';

create index if not exists user_platform_roles_role_idx on public.user_platform_roles (role);

alter table public.user_platform_roles enable row level security;

create policy "Users can read own platform role"
  on public.user_platform_roles for select
  using (auth.uid() = user_id);

-- Writes are performed with the service role from trusted server routes (admin tooling).

grant select on public.user_platform_roles to authenticated;

create or replace function public.effective_platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r.role::text from public.user_platform_roles r where r.user_id = auth.uid()),
    (select u.raw_user_meta_data->>'role' from auth.users u where u.id = auth.uid())
  );
$$;

comment on function public.effective_platform_role() is 'Role for RLS: user_platform_roles row, else auth.users raw_user_meta_data.role';

grant execute on function public.effective_platform_role() to authenticated;
