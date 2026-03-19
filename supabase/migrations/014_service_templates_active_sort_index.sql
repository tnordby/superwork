-- Speed up service template listing:
-- - filters by is_active
-- - orders by category then name
create index if not exists service_templates_is_active_category_name_idx
  on public.service_templates(is_active, category, name);

