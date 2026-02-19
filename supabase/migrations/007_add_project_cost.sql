-- Add cost column to projects table for tracking project expenses
alter table public.projects add column if not exists cost numeric(10, 2) default 0;

comment on column public.projects.cost is 'Project cost in the smallest currency unit (e.g., cents for USD/EUR)';

-- Add workspace_id to projects table to link projects to workspaces
alter table public.projects add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Create index for performance
create index if not exists projects_workspace_id_idx on public.projects(workspace_id);

-- Update RLS policies to use workspace_id
drop policy if exists "Users can view own projects" on public.projects;
drop policy if exists "Users can create own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;

create policy "Users can view projects in their workspace"
  on public.projects for select
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
    )
  );

create policy "Users can create projects in their workspace"
  on public.projects for insert
  with check (
    workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
    )
  );

create policy "Users can update projects in their workspace"
  on public.projects for update
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
    )
  );

create policy "Users can delete projects in their workspace"
  on public.projects for delete
  using (
    workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
    )
  );
