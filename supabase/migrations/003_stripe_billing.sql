-- =============================================
-- STRIPE BILLING INTEGRATION MIGRATION
-- =============================================
-- Adds Stripe subscription fields to workspaces table
-- =============================================

-- =============================================
-- PHASE 1: ADD STRIPE FIELDS TO WORKSPACES
-- =============================================

alter table public.workspaces add column if not exists stripe_customer_id text unique;
alter table public.workspaces add column if not exists stripe_subscription_id text unique;
alter table public.workspaces add column if not exists stripe_subscription_status text;
alter table public.workspaces add column if not exists stripe_price_id text;
alter table public.workspaces add column if not exists subscription_interval text; -- 'monthly', 'quarterly', 'biannual', 'annual'
alter table public.workspaces add column if not exists current_period_end timestamptz;

comment on column public.workspaces.stripe_customer_id is 'Stripe Customer ID (cus_xxx)';
comment on column public.workspaces.stripe_subscription_id is 'Active Stripe Subscription ID (sub_xxx)';
comment on column public.workspaces.stripe_subscription_status is 'Stripe subscription status: active, past_due, canceled, incomplete, etc.';
comment on column public.workspaces.stripe_price_id is 'Currently active Stripe Price ID';
comment on column public.workspaces.subscription_interval is 'Billing interval: monthly, quarterly, biannual, annual';
comment on column public.workspaces.current_period_end is 'End of current billing period';

-- =============================================
-- PHASE 2: CREATE INDEXES FOR STRIPE FIELDS
-- =============================================

create index if not exists workspaces_stripe_customer_id_idx on public.workspaces(stripe_customer_id) where stripe_customer_id is not null;
create index if not exists workspaces_stripe_subscription_id_idx on public.workspaces(stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists workspaces_stripe_subscription_status_idx on public.workspaces(stripe_subscription_status) where stripe_subscription_status is not null;
create index if not exists workspaces_current_period_end_idx on public.workspaces(current_period_end) where current_period_end is not null;

-- =============================================
-- PHASE 3: CREATE HELPER FUNCTIONS
-- =============================================

-- Function to check if workspace has active subscription
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

comment on function public.workspace_has_active_subscription is 'Check if workspace has an active Stripe subscription';

-- Function to get subscription status for a workspace
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

comment on function public.get_workspace_subscription_status is 'Get subscription details for a workspace';

-- =============================================
-- SUCCESS!
-- =============================================
-- Stripe billing schema is now complete:
-- ✓ Stripe customer and subscription fields added to workspaces
-- ✓ Indexes created for efficient queries
-- ✓ Helper functions for subscription status checks
--
-- Next steps:
-- 1. Set up Stripe API routes
-- 2. Implement webhook handlers
-- 3. Build billing UI
-- =============================================
