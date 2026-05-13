-- Adds capacity_billing_period if the table came from an older 052 revision (column missing).
-- Fresh installs get this column from 052; this migration is safe if the table does not exist yet.

do $$
begin
  if to_regclass('public.workspace_plan_terms') is not null then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'workspace_plan_terms'
        and column_name = 'capacity_billing_period'
    ) then
      alter table public.workspace_plan_terms
        add column capacity_billing_period text not null default 'monthly'
          check (capacity_billing_period in ('monthly', 'quarterly', 'biannual', 'annual'));
    end if;

    comment on column public.workspace_plan_terms.capacity_billing_period is
      'Stripe billing cadence for the capacity subscription (monthly, quarterly, biannual, annual).';

    update public.workspace_plan_terms
    set capacity_billing_period = 'annual'
    where annual_prepay = true;
  end if;
end $$;
