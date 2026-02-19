-- =============================================
-- ADD STRIPE BILLING COLUMNS ONLY
-- =============================================
-- Simple migration to add Stripe fields to existing workspaces table
-- =============================================

-- Add Stripe columns to workspaces table
alter table public.workspaces add column if not exists stripe_customer_id text unique;
alter table public.workspaces add column if not exists stripe_subscription_id text unique;
alter table public.workspaces add column if not exists stripe_subscription_status text;
alter table public.workspaces add column if not exists stripe_price_id text;
alter table public.workspaces add column if not exists subscription_interval text;
alter table public.workspaces add column if not exists current_period_end timestamptz;

-- Add comments
comment on column public.workspaces.stripe_customer_id is 'Stripe Customer ID (cus_xxx)';
comment on column public.workspaces.stripe_subscription_id is 'Active Stripe Subscription ID (sub_xxx)';
comment on column public.workspaces.stripe_subscription_status is 'Stripe subscription status: active, past_due, canceled, incomplete, etc.';
comment on column public.workspaces.stripe_price_id is 'Currently active Stripe Price ID';
comment on column public.workspaces.subscription_interval is 'Billing interval: monthly, quarterly, biannual, annual';
comment on column public.workspaces.current_period_end is 'End of current billing period';

-- Create indexes
create index if not exists workspaces_stripe_customer_id_idx on public.workspaces(stripe_customer_id) where stripe_customer_id is not null;
create index if not exists workspaces_stripe_subscription_id_idx on public.workspaces(stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists workspaces_stripe_subscription_status_idx on public.workspaces(stripe_subscription_status) where stripe_subscription_status is not null;
create index if not exists workspaces_current_period_end_idx on public.workspaces(current_period_end) where current_period_end is not null;

-- Create helper functions
create or replace function public.workspace_has_active_subscription(workspace_uuid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.workspaces
    where id = workspace_uuid
    and stripe_subscription_status in ('active', 'trialing')
    and (current_period_end is null or current_period_end > now())
  );
$$;

create or replace function public.get_workspace_subscription_status(workspace_uuid uuid)
returns table (
  subscription_status text,
  subscription_interval text,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text
)
language sql
stable
security definer
as $$
  select
    stripe_subscription_status as subscription_status,
    subscription_interval,
    current_period_end,
    stripe_customer_id,
    stripe_subscription_id
  from public.workspaces
  where id = workspace_uuid;
$$;

-- Done!
