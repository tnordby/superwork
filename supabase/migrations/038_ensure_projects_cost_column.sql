-- Team spend rollups and workspace budget logic expect projects.cost (minor units).
-- Idempotent: safe if 007_add_project_cost.sql already ran.

alter table public.projects add column if not exists cost numeric(12, 2) default 0;

comment on column public.projects.cost is 'Project budget/cost in minor currency units (e.g. cents)';
