-- =============================================
-- QUOTES AND ASSIGNMENTS TABLES
-- =============================================
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. QUOTES TABLE
-- =============================================
-- Stores quote requests from customers

create table if not exists public.quotes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete set null,

  -- Quote details
  title text not null,
  description text,
  category text not null,
  service_type text not null,

  -- Pricing
  estimated_price numeric(10, 2),
  final_price numeric(10, 2),
  currency text default 'USD',

  -- Status tracking
  status text not null default 'pending_pm_review',
  -- Status flow: pending_pm_review → pending_customer_approval → approved → rejected

  -- Assignment
  assigned_lead_user_id uuid references auth.users on delete set null,
  assignment_locked boolean default false,

  -- PM review
  reviewed_by_user_id uuid references auth.users on delete set null,
  reviewed_at timestamp with time zone,
  pm_notes text,

  -- Customer approval
  approved_at timestamp with time zone,
  approved_by_user_id uuid references auth.users on delete set null,
  rejected_at timestamp with time zone,
  rejection_reason text,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.quotes is 'Customer quote requests and approval workflow';

-- Enable RLS
alter table public.quotes enable row level security;

-- RLS Policies for quotes
create policy "Users can view their own quotes"
  on public.quotes for select
  using (auth.uid() = user_id);

create policy "Admins and PMs can view all quotes"
  on public.quotes for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

create policy "Users can create quotes"
  on public.quotes for insert
  with check (auth.uid() = user_id);

create policy "PMs can update quotes"
  on public.quotes for update
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

create policy "Users can update their pending quotes"
  on public.quotes for update
  using (
    auth.uid() = user_id
    and status = 'pending_pm_review'
  );

-- Indexes
create index if not exists quotes_user_id_idx on public.quotes(user_id);
create index if not exists quotes_status_idx on public.quotes(status);
create index if not exists quotes_assigned_lead_idx on public.quotes(assigned_lead_user_id);
create index if not exists quotes_project_id_idx on public.quotes(project_id);

-- =============================================
-- 2. PROJECT ASSIGNMENTS TABLE
-- =============================================
-- Tracks consultant assignments to projects

create table if not exists public.project_assignments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,

  -- Assignment details
  role text not null check (role in ('lead', 'contributor')),
  assigned_by_user_id uuid references auth.users on delete set null not null,
  internal_notes text,

  -- Timestamps
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  removed_at timestamp with time zone,

  -- Unique constraint: one user can only have one active role per project
  unique(project_id, user_id, removed_at)
);

comment on table public.project_assignments is 'Consultant assignments to projects with roles';

-- Enable RLS
alter table public.project_assignments enable row level security;

-- RLS Policies for assignments
create policy "Users can view assignments for their projects"
  on public.project_assignments for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_assignments.project_id
      and projects.user_id = auth.uid()
    )
    or user_id = auth.uid()
  );

create policy "Admins and PMs can view all assignments"
  on public.project_assignments for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

create policy "PMs can create assignments"
  on public.project_assignments for insert
  with check (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

create policy "PMs can update assignments"
  on public.project_assignments for update
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

-- Indexes
create index if not exists project_assignments_project_id_idx on public.project_assignments(project_id);
create index if not exists project_assignments_user_id_idx on public.project_assignments(user_id);
create index if not exists project_assignments_role_idx on public.project_assignments(role);
create index if not exists project_assignments_active_idx on public.project_assignments(project_id, user_id) where removed_at is null;

-- =============================================
-- 3. QUOTE LINE ITEMS TABLE
-- =============================================
-- Individual items within a quote

create table if not exists public.quote_line_items (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid references public.quotes on delete cascade not null,

  -- Line item details
  description text not null,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null,
  total_price numeric(10, 2) not null,

  -- Order
  order_index integer not null default 0,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.quote_line_items is 'Individual line items within quotes';

-- Enable RLS
alter table public.quote_line_items enable row level security;

-- RLS Policies for line items
create policy "Users can view line items for their quotes"
  on public.quote_line_items for select
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_line_items.quote_id
      and quotes.user_id = auth.uid()
    )
  );

create policy "PMs can view all line items"
  on public.quote_line_items for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

create policy "PMs can manage line items"
  on public.quote_line_items for all
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

-- Indexes
create index if not exists quote_line_items_quote_id_idx on public.quote_line_items(quote_id);
create index if not exists quote_line_items_order_idx on public.quote_line_items(quote_id, order_index);

-- =============================================
-- 4. UPDATED_AT TRIGGERS
-- =============================================

create trigger set_updated_at before update on public.quotes
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.quote_line_items
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- 5. GRANT PERMISSIONS
-- =============================================

grant usage on schema public to authenticated;
grant all on public.quotes to authenticated;
grant all on public.project_assignments to authenticated;
grant all on public.quote_line_items to authenticated;

-- =============================================
-- 6. HELPER FUNCTION: Create Project from Quote
-- =============================================

create or replace function public.create_project_from_quote(quote_id_param uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  new_project_id uuid;
  quote_record record;
begin
  -- Get quote details
  select * into quote_record
  from public.quotes
  where id = quote_id_param
  and status = 'approved';

  if not found then
    raise exception 'Quote not found or not approved';
  end if;

  -- Create project
  insert into public.projects (
    user_id,
    name,
    description,
    category,
    service_type,
    status,
    progress,
    assignee
  )
  values (
    quote_record.user_id,
    quote_record.title,
    quote_record.description,
    quote_record.category,
    quote_record.service_type,
    'planned',
    0,
    (select email from auth.users where id = quote_record.assigned_lead_user_id)
  )
  returning id into new_project_id;

  -- Link quote to project
  update public.quotes
  set project_id = new_project_id
  where id = quote_id_param;

  -- Copy assignment to project
  if quote_record.assigned_lead_user_id is not null then
    insert into public.project_assignments (
      project_id,
      user_id,
      role,
      assigned_by_user_id
    )
    values (
      new_project_id,
      quote_record.assigned_lead_user_id,
      'lead',
      quote_record.reviewed_by_user_id
    );
  end if;

  return new_project_id;
end;
$$;

-- =============================================
-- SUCCESS!
-- =============================================
-- Quotes and Assignments tables are now set up with:
-- ✓ quotes table with status workflow
-- ✓ project_assignments table with roles
-- ✓ quote_line_items for detailed pricing
-- ✓ RLS policies for security
-- ✓ Helper function to create projects from approved quotes
-- ✓ Proper indexes for performance
--
-- Next: Create TypeScript types and API routes!
