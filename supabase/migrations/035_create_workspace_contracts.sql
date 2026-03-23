-- Contract terms per customer workspace for accurate MRR/ARR.

create table if not exists public.workspace_contracts (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  billing_source text not null check (billing_source in ('stripe', 'manual')),
  status text not null default 'active' check (status in ('active', 'draft', 'ended', 'cancelled')),
  monthly_amount numeric(12,2) not null check (monthly_amount >= 0),
  currency text not null default 'USD',
  start_date date not null,
  end_date date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists workspace_contracts_workspace_id_idx on public.workspace_contracts(workspace_id);
create index if not exists workspace_contracts_active_window_idx on public.workspace_contracts(workspace_id, start_date, end_date);

alter table public.workspace_contracts enable row level security;

drop policy if exists "Internal staff can view workspace contracts" on public.workspace_contracts;
drop policy if exists "Internal staff can manage workspace contracts" on public.workspace_contracts;

create policy "Internal staff can view workspace contracts"
  on public.workspace_contracts for select
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager', 'consultant'));

create policy "Internal staff can manage workspace contracts"
  on public.workspace_contracts for all
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager'))
  with check (public.effective_platform_role() in ('admin', 'pm', 'project_manager'));

drop trigger if exists workspace_contracts_set_updated_at on public.workspace_contracts;
create trigger workspace_contracts_set_updated_at
before update on public.workspace_contracts
for each row
execute function public.handle_updated_at();

