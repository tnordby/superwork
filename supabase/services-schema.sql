-- =============================================
-- P6: PREDEFINED SERVICES, SOPs, TASKS & MILESTONES
-- =============================================
-- This schema implements the service template system
-- Run this in your Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. SERVICE TEMPLATES TABLE
-- =============================================
-- Defines predefined services (e.g., "HubSpot CRM Setup")

create table if not exists public.service_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null, -- 'HubSpot Services', 'Revenue Operations', etc.
  customer_description text not null, -- What customers see
  estimated_hours integer, -- Optional: estimated delivery time
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.service_templates is 'Predefined service offerings';

-- Indexes
create index if not exists service_templates_category_idx on public.service_templates(category);
create index if not exists service_templates_is_active_idx on public.service_templates(is_active);

-- =============================================
-- 2. SERVICE SOPS TABLE
-- =============================================
-- Internal execution procedures (NEVER visible to customers)

create table if not exists public.service_sops (
  id uuid default gen_random_uuid() primary key,
  service_template_id uuid references public.service_templates on delete cascade not null,
  title text not null,
  description text,
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.service_sops is 'Standard Operating Procedures for services (internal only)';

-- Indexes
create index if not exists service_sops_service_template_id_idx on public.service_sops(service_template_id);
create index if not exists service_sops_order_idx on public.service_sops(order_index);

-- =============================================
-- 3. SOP TASKS TABLE (Template Level)
-- =============================================
-- Default tasks that will be copied to projects

create table if not exists public.sop_tasks (
  id uuid default gen_random_uuid() primary key,
  sop_id uuid references public.service_sops on delete cascade not null,
  title text not null,
  description text,
  order_index integer not null default 0,
  is_required boolean default true,
  estimated_hours numeric(5, 2), -- Optional: time estimate per task
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.sop_tasks is 'Template tasks that are copied to projects on creation';

-- Indexes
create index if not exists sop_tasks_sop_id_idx on public.sop_tasks(sop_id);
create index if not exists sop_tasks_order_idx on public.sop_tasks(order_index);

-- =============================================
-- 4. EXTEND PROJECTS TABLE
-- =============================================
-- Add service_template_id to track which template was used

alter table public.projects
add column if not exists service_template_id uuid references public.service_templates on delete set null;

create index if not exists projects_service_template_id_idx on public.projects(service_template_id);

-- =============================================
-- 5. EXTEND TASKS TABLE
-- =============================================
-- Add is_custom field to track template vs manually added tasks
-- NOTE: Run milestones-tasks-schema.sql BEFORE this file

alter table public.project_tasks
add column if not exists is_custom boolean default false;

comment on column public.project_tasks.is_custom is 'True if task was manually added, false if from template';

-- =============================================
-- 6. PROJECT PHASE CHANGE LOG
-- =============================================
-- Audit trail for status/phase changes

create table if not exists public.project_phase_changes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  changed_by_user_id uuid references auth.users on delete set null not null,
  from_status text not null,
  to_status text not null,
  note text, -- Optional reason/note
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.project_phase_changes is 'Audit log for project status changes';

-- Indexes
create index if not exists project_phase_changes_project_id_idx on public.project_phase_changes(project_id);
create index if not exists project_phase_changes_created_at_idx on public.project_phase_changes(created_at desc);

-- =============================================
-- 7. TASK STATUS CHANGE LOG
-- =============================================
-- Audit trail for task completion

create table if not exists public.task_status_changes (
  id uuid default gen_random_uuid() primary key,
  task_id uuid not null, -- references tasks table
  changed_by_user_id uuid references auth.users on delete set null not null,
  from_status text not null,
  to_status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.task_status_changes is 'Audit log for task status changes';

-- Indexes
create index if not exists task_status_changes_task_id_idx on public.task_status_changes(task_id);
create index if not exists task_status_changes_created_at_idx on public.task_status_changes(created_at desc);

-- =============================================
-- 8. FUNCTION: INSTANTIATE PROJECT FROM TEMPLATE
-- =============================================
-- Copies SOPs and tasks when a project is created from a template

create or replace function public.instantiate_project_from_template(
  project_id_param uuid,
  service_template_id_param uuid
)
returns void
language plpgsql
security definer
as $$
declare
  sop_record record;
  task_record record;
  new_milestone_id uuid;
begin
  -- For each SOP in the service template
  for sop_record in
    select * from public.service_sops
    where service_template_id = service_template_id_param
    order by order_index
  loop
    -- Create a milestone for this SOP (milestones represent SOPs in project view)
    insert into public.project_milestones (project_id, title, description, order_index, completed)
    values (project_id_param, sop_record.title, sop_record.description, sop_record.order_index, false)
    returning id into new_milestone_id;

    -- For each task in this SOP, create a project task
    for task_record in
      select * from public.sop_tasks
      where sop_id = sop_record.id
      order by order_index
    loop
      insert into public.project_tasks (
        project_id,
        milestone_id,
        title,
        description,
        order_index,
        completed,
        is_custom
      )
      values (
        project_id_param,
        new_milestone_id,
        task_record.title,
        task_record.description,
        task_record.order_index,
        false,
        false -- Not custom, from template
      );
    end loop;
  end loop;
end;
$$;

comment on function public.instantiate_project_from_template is 'Copies SOPs and tasks from template to new project';

-- =============================================
-- 9. FUNCTION: CALCULATE PROJECT PROGRESS
-- =============================================
-- Auto-calculates progress based on completed tasks

create or replace function public.calculate_project_progress(project_id_param uuid)
returns integer
language plpgsql
security definer
as $$
declare
  total_tasks integer;
  completed_tasks integer;
  progress_pct integer;
begin
  -- Count total tasks
  select count(*) into total_tasks
  from public.project_tasks
  where project_id = project_id_param;

  -- If no tasks, return 0
  if total_tasks = 0 then
    return 0;
  end if;

  -- Count completed tasks
  select count(*) into completed_tasks
  from public.project_tasks
  where project_id = project_id_param
  and completed = true;

  -- Calculate percentage
  progress_pct := round((completed_tasks::numeric / total_tasks::numeric) * 100);

  -- Update project
  update public.projects
  set progress = progress_pct
  where id = project_id_param;

  return progress_pct;
end;
$$;

comment on function public.calculate_project_progress is 'Calculates and updates project progress percentage';

-- =============================================
-- 10. TRIGGER: AUTO-UPDATE PROGRESS ON TASK CHANGE
-- =============================================

create or replace function public.handle_task_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Recalculate progress for the project
  perform public.calculate_project_progress(new.project_id);
  return new;
end;
$$;

drop trigger if exists task_status_changed on public.project_tasks;
create trigger task_status_changed
  after update of completed on public.project_tasks
  for each row
  execute function public.handle_task_status_change();

-- =============================================
-- 11. RLS POLICIES FOR NEW TABLES
-- =============================================

-- Service Templates: Public read, admin-only write
alter table public.service_templates enable row level security;

create policy "Anyone can view active service templates"
  on public.service_templates for select
  using (is_active = true);

-- SOPs: Only admins/consultants can view (NEVER customers)
alter table public.service_sops enable row level security;

create policy "Only authenticated users can view SOPs"
  on public.service_sops for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        or auth.users.raw_user_meta_data->>'role' = 'pm'
        or auth.users.raw_user_meta_data->>'role' = 'consultant'
      )
    )
  );

-- SOP Tasks: Only admins/consultants can view
alter table public.sop_tasks enable row level security;

create policy "Only authenticated users can view SOP tasks"
  on public.sop_tasks for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        or auth.users.raw_user_meta_data->>'role' = 'pm'
        or auth.users.raw_user_meta_data->>'role' = 'consultant'
      )
    )
  );

-- Phase Changes: Users can view their own project phase changes
alter table public.project_phase_changes enable row level security;

create policy "Users can view phase changes for their projects"
  on public.project_phase_changes for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_phase_changes.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Task Status Changes: Users can view changes for their project tasks
alter table public.task_status_changes enable row level security;

create policy "Users can view task changes for their projects"
  on public.task_status_changes for select
  using (
    exists (
      select 1 from public.project_tasks
      join public.projects on projects.id = project_tasks.project_id
      where project_tasks.id = task_status_changes.task_id
      and projects.user_id = auth.uid()
    )
  );

-- =============================================
-- 12. UPDATED_AT TRIGGERS
-- =============================================

create trigger set_updated_at before update on public.service_templates
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.service_sops
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.sop_tasks
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- 13. GRANT PERMISSIONS
-- =============================================

grant usage on schema public to authenticated;
grant all on public.service_templates to authenticated;
grant all on public.service_sops to authenticated;
grant all on public.sop_tasks to authenticated;
grant all on public.project_phase_changes to authenticated;
grant all on public.task_status_changes to authenticated;

-- =============================================
-- SUCCESS!
-- =============================================
-- Your service template system is now set up with:
-- ✓ Service templates with customer descriptions
-- ✓ SOPs (internal only, never shown to customers)
-- ✓ SOP tasks that copy to projects
-- ✓ Project instantiation from templates
-- ✓ Automatic progress calculation
-- ✓ Audit trails for status changes
-- ✓ Proper RLS policies for visibility control
--
-- Next: Create API routes and UI
