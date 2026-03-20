-- Add value-pricing fields to quotes (single final price model).

alter table public.quotes
  add column if not exists desired_future_state text,
  add column if not exists success_metrics text,
  add column if not exists estimated_value numeric(12, 2),
  add column if not exists adjusted_hours numeric(10, 2),
  add column if not exists internal_hourly_rate numeric(10, 2),
  add column if not exists desired_margin_percent numeric(5, 2),
  add column if not exists value_adjustment numeric(12, 2),
  add column if not exists floor_price numeric(12, 2);

