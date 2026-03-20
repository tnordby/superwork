-- Add explicit client info on quote and dedicated quote milestones for PM customization.

alter table public.quotes
  add column if not exists client_first_name text,
  add column if not exists client_last_name text,
  add column if not exists client_email text,
  add column if not exists client_company_name text;

create table if not exists public.quote_milestones (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  title text not null,
  description text,
  estimated_hours numeric(10,2),
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists quote_milestones_quote_id_idx on public.quote_milestones(quote_id);
create index if not exists quote_milestones_order_idx on public.quote_milestones(quote_id, order_index);

alter table public.quote_milestones enable row level security;

drop policy if exists "Users can view quote milestones they have access to" on public.quote_milestones;
drop policy if exists "Quote managers can manage quote milestones" on public.quote_milestones;

create policy "Users can view quote milestones they have access to"
  on public.quote_milestones for select
  using (
    exists (
      select 1
      from public.quotes q
      where q.id = quote_milestones.quote_id
      and (
        q.user_id = auth.uid()
        or public.effective_platform_role() in ('admin', 'pm', 'project_manager')
      )
    )
  );

create policy "Quote managers can manage quote milestones"
  on public.quote_milestones for all
  using (
    public.effective_platform_role() in ('admin', 'pm', 'project_manager')
  )
  with check (
    public.effective_platform_role() in ('admin', 'pm', 'project_manager')
  );

drop trigger if exists quote_milestones_set_updated_at on public.quote_milestones;
create trigger quote_milestones_set_updated_at
before update on public.quote_milestones
for each row
execute function public.set_updated_at();

