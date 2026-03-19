-- Speed up ordered service template listing in admin/customer views.
create index if not exists service_templates_category_name_idx
  on public.service_templates(category, name);
