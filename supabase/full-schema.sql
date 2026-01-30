-- =============================================
-- SUPERWORK CUSTOMER PORTAL - COMPLETE DATABASE SCHEMA
-- =============================================
-- Run this in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste and Run
-- =============================================

-- =============================================
-- 1. PROFILES TABLE
-- =============================================
-- User profile information extending auth.users

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  first_name text,
  last_name text,
  company_name text,
  avatar_url text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.profiles is 'User profile information';

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Users can insert own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Trigger to auto-create profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, updated_at, created_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    now(),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- 2. PROJECTS TABLE
-- =============================================
-- Customer projects and their status

create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  category text not null, -- 'HubSpot Services', 'Revenue Operations', etc.
  service_type text not null, -- Specific service name
  status text not null default 'planning', -- 'planning', 'in_progress', 'in_review', 'completed', 'on_hold'
  progress integer default 0 check (progress >= 0 and progress <= 100),
  assignee text, -- Consultant/team assigned
  due_date timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.projects is 'Customer projects and service requests';

-- Enable RLS
alter table public.projects enable row level security;

-- RLS Policies for projects
create policy "Users can view own projects"
  on public.projects for select
  using ( auth.uid() = user_id );

create policy "Users can create own projects"
  on public.projects for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own projects"
  on public.projects for update
  using ( auth.uid() = user_id );

-- Indexes for performance
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_created_at_idx on public.projects(created_at desc);

-- =============================================
-- 3. CONVERSATIONS TABLE
-- =============================================
-- Chat conversations between users and consultants

create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  consultant_name text not null,
  consultant_initials text not null,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.conversations is 'Conversation threads for projects';

-- Enable RLS
alter table public.conversations enable row level security;

-- RLS Policies for conversations
create policy "Users can view own conversations"
  on public.conversations for select
  using ( auth.uid() = user_id );

create policy "Users can create own conversations"
  on public.conversations for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own conversations"
  on public.conversations for update
  using ( auth.uid() = user_id );

-- Indexes
create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists conversations_project_id_idx on public.conversations(project_id);
create index if not exists conversations_last_message_at_idx on public.conversations(last_message_at desc);

-- =============================================
-- 4. MESSAGES TABLE
-- =============================================
-- Individual messages within conversations

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  sender_id uuid references auth.users on delete set null,
  sender_name text not null,
  content text not null,
  is_from_user boolean not null default true, -- true if from user, false if from consultant
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.messages is 'Individual chat messages';

-- Enable RLS
alter table public.messages enable row level security;

-- RLS Policies for messages
create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can create messages in their conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);

-- =============================================
-- 5. ASSETS TABLE
-- =============================================
-- Uploaded files and documents

create table if not exists public.assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  project_id uuid references public.projects on delete set null,
  name text not null,
  file_type text not null, -- 'logo', 'pdf', 'image', 'document', 'other'
  file_extension text,
  file_size bigint not null, -- in bytes
  storage_path text not null, -- Supabase storage path
  url text, -- Public URL if applicable
  uploaded_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.assets is 'User uploaded files and assets';

-- Enable RLS
alter table public.assets enable row level security;

-- RLS Policies for assets
create policy "Users can view own assets"
  on public.assets for select
  using ( auth.uid() = user_id );

create policy "Users can create own assets"
  on public.assets for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete own assets"
  on public.assets for delete
  using ( auth.uid() = user_id );

-- Indexes
create index if not exists assets_user_id_idx on public.assets(user_id);
create index if not exists assets_project_id_idx on public.assets(project_id);
create index if not exists assets_created_at_idx on public.assets(created_at desc);

-- =============================================
-- 6. INVOICES TABLE
-- =============================================
-- Billing invoices

create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  invoice_number text unique not null,
  amount numeric(10, 2) not null,
  currency text default 'USD',
  status text not null default 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  due_date timestamp with time zone,
  paid_at timestamp with time zone,
  description text,
  pdf_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.invoices is 'Customer invoices';

-- Enable RLS
alter table public.invoices enable row level security;

-- RLS Policies for invoices
create policy "Users can view own invoices"
  on public.invoices for select
  using ( auth.uid() = user_id );

-- Indexes
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_created_at_idx on public.invoices(created_at desc);

-- =============================================
-- 7. TEAM_MEMBERS TABLE
-- =============================================
-- Team members who can access the account

create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  account_owner_id uuid references auth.users on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'member', -- 'admin', 'member', 'viewer'
  invited_at timestamp with time zone default timezone('utc'::text, now()) not null,
  accepted_at timestamp with time zone,
  unique(account_owner_id, user_id)
);

comment on table public.team_members is 'Team members and collaborators';

-- Enable RLS
alter table public.team_members enable row level security;

-- RLS Policies for team_members
create policy "Users can view team members in their account"
  on public.team_members for select
  using ( auth.uid() = account_owner_id or auth.uid() = user_id );

create policy "Account owners can manage team members"
  on public.team_members for all
  using ( auth.uid() = account_owner_id );

-- Indexes
create index if not exists team_members_account_owner_idx on public.team_members(account_owner_id);
create index if not exists team_members_user_id_idx on public.team_members(user_id);

-- =============================================
-- 8. ACCOUNT_USAGE TABLE
-- =============================================
-- Track account usage and credits

create table if not exists public.account_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  month date not null, -- First day of the month
  starting_balance numeric(10, 2) default 0,
  used_balance numeric(10, 2) default 0,
  in_progress_balance numeric(10, 2) default 0,
  expiring_balance numeric(10, 2) default 0,
  available_balance numeric(10, 2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, month)
);

comment on table public.account_usage is 'Monthly account usage and balance tracking';

-- Enable RLS
alter table public.account_usage enable row level security;

-- RLS Policies
create policy "Users can view own usage"
  on public.account_usage for select
  using ( auth.uid() = user_id );

-- Indexes
create index if not exists account_usage_user_id_idx on public.account_usage(user_id);
create index if not exists account_usage_month_idx on public.account_usage(month desc);

-- =============================================
-- 9. UPDATED_AT TRIGGER FUNCTION
-- =============================================
-- Auto-update updated_at timestamp

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger to relevant tables
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.conversations
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.account_usage
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- 10. GRANT PERMISSIONS
-- =============================================

grant usage on schema public to authenticated;
grant all on public.profiles to authenticated;
grant all on public.projects to authenticated;
grant all on public.conversations to authenticated;
grant all on public.messages to authenticated;
grant all on public.assets to authenticated;
grant all on public.invoices to authenticated;
grant all on public.team_members to authenticated;
grant all on public.account_usage to authenticated;

-- =============================================
-- 11. ENABLE REALTIME (Optional - for inbox)
-- =============================================
-- Uncomment if you want real-time updates for messages

-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.conversations;

-- =============================================
-- SUCCESS!
-- =============================================
-- Your complete database schema is now set up with:
-- ✓ Profiles table with auto-creation trigger
-- ✓ Projects table for tracking customer projects
-- ✓ Conversations and Messages for inbox functionality
-- ✓ Assets table for file management
-- ✓ Invoices table for billing
-- ✓ Team members table for collaboration
-- ✓ Account usage table for balance tracking
-- ✓ All tables have Row Level Security enabled
-- ✓ Proper indexes for performance
-- ✓ Auto-updating timestamps
--
-- Next: Start using the tables in your application!
