-- Expand quote pricing model for risk-aware fixed pricing.

alter table public.quotes
  add column if not exists estimated_hours_low numeric(10, 2),
  add column if not exists estimated_hours_high numeric(10, 2),
  add column if not exists pass_through_costs numeric(12, 2),
  add column if not exists certainty_buffer_percent numeric(5, 2),
  add column if not exists certainty_premium numeric(12, 2),
  add column if not exists value_anchor_price numeric(12, 2),
  add column if not exists value_confidence_score integer;

