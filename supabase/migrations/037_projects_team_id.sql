-- Optional link from projects to workspace teams (spend attribution vs team budget envelopes).

alter table public.projects
  add column if not exists team_id uuid references public.workspace_teams (id) on delete set null;

create index if not exists projects_workspace_team_idx on public.projects (workspace_id, team_id)
  where team_id is not null;

comment on column public.projects.team_id is 'Workspace team this project is billed/attributed to; must match project.workspace_id';

create or replace function public.enforce_project_team_workspace()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.team_id is null then
    return new;
  end if;
  if new.workspace_id is null then
    raise exception 'Assign a workspace to the project before assigning a team';
  end if;
  if not exists (
    select 1 from public.workspace_teams t
    where t.id = new.team_id and t.workspace_id = new.workspace_id
  ) then
    raise exception 'Team must belong to the same workspace as the project';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_enforce_team_workspace on public.projects;
create trigger projects_enforce_team_workspace
  before insert or update of team_id, workspace_id on public.projects
  for each row
  execute function public.enforce_project_team_workspace();
