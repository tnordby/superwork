-- =============================================
-- SETUP SERVICE TEMPLATES SYSTEM
-- =============================================
-- Creates service templates, SOPs, and tasks tables
-- Populates with initial service data
-- =============================================

-- =============================================
-- 1. CREATE TABLES
-- =============================================

create table if not exists public.service_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  customer_description text not null,
  estimated_hours integer,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.service_templates is 'Predefined service offerings';

create index if not exists service_templates_category_idx on public.service_templates(category);
create index if not exists service_templates_is_active_idx on public.service_templates(is_active);

-- SOPs table
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

create index if not exists service_sops_service_template_id_idx on public.service_sops(service_template_id);
create index if not exists service_sops_order_idx on public.service_sops(order_index);

-- SOP tasks table
create table if not exists public.sop_tasks (
  id uuid default gen_random_uuid() primary key,
  sop_id uuid references public.service_sops on delete cascade not null,
  title text not null,
  description text,
  order_index integer not null default 0,
  is_required boolean default true,
  estimated_hours numeric(5, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.sop_tasks is 'Template tasks that are copied to projects on creation';

create index if not exists sop_tasks_sop_id_idx on public.sop_tasks(sop_id);
create index if not exists sop_tasks_order_idx on public.sop_tasks(order_index);

-- Extend projects table
alter table public.projects add column if not exists service_template_id uuid references public.service_templates on delete set null;
create index if not exists projects_service_template_id_idx on public.projects(service_template_id);

-- =============================================
-- 2. ENABLE RLS
-- =============================================

alter table public.service_templates enable row level security;
alter table public.service_sops enable row level security;
alter table public.sop_tasks enable row level security;

-- Service Templates: Anyone authenticated can view active templates
create policy "Anyone can view active service templates"
  on public.service_templates for select
  using (is_active = true);

-- SOPs: Internal only (for future admin interface)
create policy "Authenticated users can view SOPs"
  on public.service_sops for select
  to authenticated
  using (true);

-- SOP Tasks: Internal only (for future admin interface)
create policy "Authenticated users can view SOP tasks"
  on public.sop_tasks for select
  to authenticated
  using (true);

-- =============================================
-- 3. GRANT PERMISSIONS
-- =============================================

grant usage on schema public to authenticated;
grant select on public.service_templates to authenticated;
grant select on public.service_sops to authenticated;
grant select on public.sop_tasks to authenticated;

-- =============================================
-- 4. INSERT SAMPLE SERVICE DATA
-- =============================================

-- HubSpot Onboarding
DO $$
DECLARE
  onboarding_id uuid;
BEGIN
  INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
  VALUES (
    'HubSpot onboarding',
    'HubSpot Services',
    'Fast, structured onboarding tailored to your business',
    40,
    true
  ) RETURNING id INTO onboarding_id;
END $$;

-- CRM Implementation
DO $$
DECLARE
  crm_impl_id uuid;
BEGIN
  INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
  VALUES (
    'CRM implementation',
    'HubSpot Services',
    'Custom setup of objects, data model, and user permissions',
    50,
    true
  ) RETURNING id INTO crm_impl_id;
END $$;

-- CRM Migration
DO $$
DECLARE
  migration_id uuid;
BEGIN
  INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
  VALUES (
    'CRM migration',
    'HubSpot Services',
    'Clean migration of contacts, deals, companies, custom objects',
    60,
    true
  ) RETURNING id INTO migration_id;
END $$;

-- Data Cleansing
INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
VALUES
  ('Data cleansing', 'HubSpot Services', 'Improve data accuracy with workflows and automation', 30, true),
  ('Lifecycle management', 'HubSpot Services', 'Define your lead stages, scoring, and handover processes', 35, true);

-- Revenue Operations Services
INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
VALUES
  ('Sales process design', 'Revenue Operations', 'Build pipelines, playbooks, and activities that drive revenue', 50, true),
  ('Sales enablement', 'Revenue Operations', 'Templates, sequences, and content aligned to your buyers', 40, true),
  ('Account-Based Marketing', 'Revenue Operations', 'Target and activate high-value accounts inside HubSpot', 45, true),
  ('Reporting & dashboards', 'Revenue Operations', 'Create insight-driven dashboards for leadership & teams', 30, true),
  ('Customer success', 'Revenue Operations', 'Understand customer health inside HubSpot', 40, true);

-- Technical Services
INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
VALUES
  ('Custom API integrations', 'Technical Services', 'Connect HubSpot with ERPs, SaaS tools, or internal systems', 60, true),
  ('Programmable automation', 'Technical Services', 'Advanced workflows using custom code actions', 45, true),
  ('Custom objects', 'Technical Services', 'Build a CRM that matches your real business model', 50, true),
  ('HubSpot CMS development', 'Technical Services', 'Themes, modules, landing pages, and customer portals', 80, true),
  ('CRM extensions', 'Technical Services', 'Build sidebar apps, cards, and UI extensions for teams', 70, true);

-- AI & Data Services
INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
VALUES
  ('HubSpot Data Hub setup', 'AI & Data Services', 'Configure data collections, models, and ingestion', 50, true),
  ('Data enrichment', 'AI & Data Services', 'Automate enrichment using APIs and AI', 40, true),
  ('Predictive scoring', 'AI & Data Services', 'AI-driven scoring based on historical CRM performance', 45, true),
  ('AI agents', 'AI & Data Services', 'Deploy autonomous agents for research and follow-ups', 60, true),
  ('Data quality automation', 'AI & Data Services', 'Automated corrections and data quality monitoring', 35, true);

-- =============================================
-- 5. TRIGGERS
-- =============================================

create trigger set_updated_at before update on public.service_templates
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.service_sops
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.sop_tasks
  for each row execute procedure public.handle_updated_at();

-- Done!
