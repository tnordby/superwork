-- Capacity subscription terms + booster purchases (portal pricing model v1).

create table if not exists public.workspace_plan_terms (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  monthly_budget_eur numeric(12,2) not null check (monthly_budget_eur >= 0),
  monthly_hours numeric(10,2) not null,
  annual_prepay boolean not null default false,
  pricing_model text not null check (pricing_model in ('slider_v1', 'legacy_tier', 'enterprise_custom')),
  legacy_tier text,
  committed_monthly_floor_eur numeric(12,2),
  service_fee_eur numeric(12,2) not null default 0,
  sales_escalation_note text,
  sales_escalation_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.workspace_plan_terms is 'Canonical portal subscription capacity (EUR) and pricing model; Stripe remains payment source of truth.';

create table if not exists public.workspace_boosters (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  amount_eur numeric(12,2) not null check (amount_eur >= 0),
  hours_granted numeric(10,2) not null,
  package_type text,
  valid_from date not null,
  valid_until date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.workspace_boosters is 'Extra capacity purchases; validity windows enforced in product logic.';

create index if not exists workspace_boosters_workspace_id_idx on public.workspace_boosters(workspace_id);
create index if not exists workspace_boosters_workspace_status_idx on public.workspace_boosters(workspace_id, status);

alter table public.workspace_plan_terms enable row level security;
alter table public.workspace_boosters enable row level security;

drop policy if exists "Workspace members can view plan terms" on public.workspace_plan_terms;
create policy "Workspace members can view plan terms"
  on public.workspace_plan_terms for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_plan_terms.workspace_id
      and (
        w.owner_id = auth.uid()
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = w.id and wm.user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Internal staff can view workspace plan terms" on public.workspace_plan_terms;
create policy "Internal staff can view workspace plan terms"
  on public.workspace_plan_terms for select
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant'));

drop policy if exists "Workspace members can view boosters" on public.workspace_boosters;
create policy "Workspace members can view boosters"
  on public.workspace_boosters for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_boosters.workspace_id
      and (
        w.owner_id = auth.uid()
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = w.id and wm.user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Internal staff can view workspace boosters" on public.workspace_boosters;
create policy "Internal staff can view workspace boosters"
  on public.workspace_boosters for select
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant'));

drop trigger if exists workspace_plan_terms_set_updated_at on public.workspace_plan_terms;
create trigger workspace_plan_terms_set_updated_at
before update on public.workspace_plan_terms
for each row execute function public.handle_updated_at();
