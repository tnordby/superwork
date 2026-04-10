-- Customer workspace sub-teams: group members and record budget envelopes (allocation planning).
-- Access control: workspace owner or workspace_members with role owner/admin manage teams;
-- all workspace members can view teams in their workspace.

create table if not exists public.workspace_teams (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  budget_allocated_cents bigint not null default 0 check (budget_allocated_cents >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists workspace_teams_workspace_id_idx on public.workspace_teams (workspace_id);

comment on table public.workspace_teams is 'Named teams within a client workspace for members and budget envelopes';

create table if not exists public.workspace_team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid not null references public.workspace_teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (team_id, user_id)
);

create index if not exists workspace_team_members_team_id_idx on public.workspace_team_members (team_id);
create index if not exists workspace_team_members_user_id_idx on public.workspace_team_members (user_id);

comment on table public.workspace_team_members is 'Users assigned to a workspace team (must also be workspace members)';

alter table public.workspace_teams enable row level security;
alter table public.workspace_team_members enable row level security;

-- Helper: actor is workspace owner
create or replace function public.is_workspace_owner_for_team(p_team_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_teams t
    join public.workspaces w on w.id = t.workspace_id
    where t.id = p_team_id
      and w.owner_id = p_uid
  );
$$;

-- Helper: actor is workspace admin (workspace_members) for team's workspace
create or replace function public.is_workspace_admin_for_team(p_team_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_teams t
    join public.workspace_members wm on wm.workspace_id = t.workspace_id
    where t.id = p_team_id
      and wm.user_id = p_uid
      and wm.role in ('owner', 'admin')
  );
$$;

-- Helper: actor is any member of team's workspace
create or replace function public.is_workspace_member_for_team_workspace(p_team_id uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_teams t
    where t.id = p_team_id
      and (
        exists (
          select 1 from public.workspaces w
          where w.id = t.workspace_id and w.owner_id = p_uid
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = t.workspace_id and wm.user_id = p_uid
        )
      )
  );
$$;

grant execute on function public.is_workspace_owner_for_team(uuid, uuid) to authenticated;
grant execute on function public.is_workspace_admin_for_team(uuid, uuid) to authenticated;
grant execute on function public.is_workspace_member_for_team_workspace(uuid, uuid) to authenticated;

-- workspace_teams policies
create policy "Members can view workspace teams"
  on public.workspace_teams for select
  to authenticated
  using (public.is_workspace_member_for_team_workspace(id, auth.uid()));

create policy "Owners and admins manage workspace teams"
  on public.workspace_teams for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = w.id
              and wm.user_id = auth.uid()
              and wm.role in ('owner', 'admin')
          )
        )
    )
  );

create policy "Owners and admins update workspace teams"
  on public.workspace_teams for update
  to authenticated
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_teams.workspace_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = w.id
              and wm.user_id = auth.uid()
              and wm.role in ('owner', 'admin')
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_teams.workspace_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = w.id
              and wm.user_id = auth.uid()
              and wm.role in ('owner', 'admin')
          )
        )
    )
  );

create policy "Owners and admins delete workspace teams"
  on public.workspace_teams for delete
  to authenticated
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_teams.workspace_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = w.id
              and wm.user_id = auth.uid()
              and wm.role in ('owner', 'admin')
          )
        )
    )
  );

-- workspace_team_members policies
create policy "Members can view team rosters"
  on public.workspace_team_members for select
  to authenticated
  using (public.is_workspace_member_for_team_workspace(team_id, auth.uid()));

create policy "Owners and admins add team members"
  on public.workspace_team_members for insert
  to authenticated
  with check (
    public.is_workspace_owner_for_team(team_id, auth.uid())
    or public.is_workspace_admin_for_team(team_id, auth.uid())
  );

create policy "Owners and admins remove team members"
  on public.workspace_team_members for delete
  to authenticated
  using (
    public.is_workspace_owner_for_team(team_id, auth.uid())
    or public.is_workspace_admin_for_team(team_id, auth.uid())
  );

drop trigger if exists workspace_teams_set_updated_at on public.workspace_teams;
create trigger workspace_teams_set_updated_at
  before update on public.workspace_teams
  for each row execute function public.handle_updated_at();
