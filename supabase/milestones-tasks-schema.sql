-- =============================================
-- MILESTONES AND TASKS TABLES
-- =============================================
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. PROJECT MILESTONES TABLE
-- =============================================
-- Milestones represent major deliverables in a project

create table if not exists public.project_milestones (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  title text not null,
  description text,
  order_index integer not null default 0,
  completed boolean default false,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.project_milestones is 'Major milestones for project delivery';

-- Enable RLS
alter table public.project_milestones enable row level security;

-- RLS Policies for milestones
create policy "Users can view milestones for their projects"
  on public.project_milestones for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_milestones.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create milestones for their projects"
  on public.project_milestones for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_milestones.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update milestones for their projects"
  on public.project_milestones for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_milestones.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete milestones for their projects"
  on public.project_milestones for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_milestones.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists project_milestones_project_id_idx on public.project_milestones(project_id);
create index if not exists project_milestones_order_idx on public.project_milestones(project_id, order_index);

-- =============================================
-- 2. PROJECT TASKS TABLE
-- =============================================
-- Tasks are individual work items within a project

create table if not exists public.project_tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  milestone_id uuid references public.project_milestones on delete set null,
  title text not null,
  description text,
  order_index integer not null default 0,
  completed boolean default false,
  assignee text,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.project_tasks is 'Individual tasks within projects';

-- Enable RLS
alter table public.project_tasks enable row level security;

-- RLS Policies for tasks
create policy "Users can view tasks for their projects"
  on public.project_tasks for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_tasks.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create tasks for their projects"
  on public.project_tasks for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_tasks.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update tasks for their projects"
  on public.project_tasks for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_tasks.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete tasks for their projects"
  on public.project_tasks for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_tasks.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists project_tasks_project_id_idx on public.project_tasks(project_id);
create index if not exists project_tasks_milestone_id_idx on public.project_tasks(milestone_id);
create index if not exists project_tasks_order_idx on public.project_tasks(project_id, order_index);

-- =============================================
-- 3. UPDATED_AT TRIGGERS
-- =============================================
-- Auto-update updated_at timestamp

create trigger set_updated_at before update on public.project_milestones
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.project_tasks
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- 4. GRANT PERMISSIONS
-- =============================================

grant usage on schema public to authenticated;
grant all on public.project_milestones to authenticated;
grant all on public.project_tasks to authenticated;

-- =============================================
-- 5. FUNCTION TO AUTO-UPDATE PROJECT PROGRESS
-- =============================================
-- Automatically calculate project progress based on completed tasks

create or replace function public.update_project_progress()
returns trigger
language plpgsql
security definer
as $$
declare
  total_tasks integer;
  completed_tasks integer;
  new_progress integer;
begin
  -- Count total and completed tasks for the project
  select count(*), count(*) filter (where completed = true)
  into total_tasks, completed_tasks
  from public.project_tasks
  where project_id = COALESCE(NEW.project_id, OLD.project_id);

  -- Calculate progress percentage
  if total_tasks > 0 then
    new_progress := round((completed_tasks::numeric / total_tasks::numeric) * 100);
  else
    new_progress := 0;
  end if;

  -- Update project progress
  update public.projects
  set progress = new_progress
  where id = COALESCE(NEW.project_id, OLD.project_id);

  return COALESCE(NEW, OLD);
end;
$$;

-- Trigger to update progress when tasks change
drop trigger if exists update_progress_on_task_change on public.project_tasks;
create trigger update_progress_on_task_change
  after insert or update or delete on public.project_tasks
  for each row execute procedure public.update_project_progress();

-- =============================================
-- SUCCESS!
-- =============================================
-- Milestones and Tasks tables are now set up with:
-- ✓ project_milestones table
-- ✓ project_tasks table
-- ✓ RLS policies linked to user's projects
-- ✓ Auto-updating timestamps
-- ✓ Automatic progress calculation based on task completion
-- ✓ Proper indexes for performance
--
-- Next: Add milestones and tasks to your projects!
