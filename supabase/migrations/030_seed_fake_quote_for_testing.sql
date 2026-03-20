-- Seed one fake quote for UI testing.
-- Idempotent: only inserts if this exact title does not already exist.

with target_user as (
  select
    id as user_id
  from auth.users
  where lower(email) in (
    'test.pm@superwork.co',
    'test.consultant@superwork.co',
    'test.admin@superwork.co'
  )
  order by created_at asc
  limit 1
),
template_match as (
  select
    name as service_name,
    category as service_category,
    estimated_hours
  from public.service_templates
  where is_active = true
  order by created_at asc
  limit 1
)
insert into public.quotes (
  user_id,
  title,
  description,
  category,
  service_type,
  estimated_price,
  final_price,
  currency,
  status,
  pm_notes,
  desired_future_state,
  success_metrics,
  estimated_value,
  adjusted_hours,
  internal_hourly_rate,
  desired_margin_percent,
  value_adjustment,
  floor_price
)
select
  tu.user_id,
  'TEST: HubSpot RevOps Lift Q2',
  'This is a seeded quote for testing PM/customer quote workflows in the app.',
  coalesce(tm.service_category, 'HubSpot Services'),
  coalesce(tm.service_name, 'HubSpot onboarding'),
  12000,
  18500,
  'USD',
  'pending_customer_approval',
  'Seeded by migration 030 for UI testing only.',
  'Move from reactive CRM admin to proactive RevOps execution.',
  'Increase MQL->SQL conversion by 20% and reduce lead response time below 10 minutes.',
  150000,
  coalesce(tm.estimated_hours, 40),
  120,
  35,
  4500,
  round(coalesce(tm.estimated_hours, 40) * 120, 2)
from target_user tu
left join template_match tm on true
where not exists (
  select 1
  from public.quotes q
  where q.title = 'TEST: HubSpot RevOps Lift Q2'
);

