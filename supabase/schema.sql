-- =============================================
-- Superwork Customer Portal Database Schema
-- =============================================
-- Run this in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste and Run

-- =============================================
-- 1. CREATE PROFILES TABLE
-- =============================================
-- Extends auth.users with additional user information

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text,
  first_name text,
  last_name text,
  company_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add comment to table
comment on table public.profiles is 'User profile information extending auth.users';

-- =============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =============================================

alter table public.profiles enable row level security;

-- =============================================
-- 3. CREATE RLS POLICIES
-- =============================================

-- Policy: Users can view their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  using ( auth.uid() = id );

-- Policy: Users can update their own profile
create policy "Users can update own profile"
  on public.profiles
  for update
  using ( auth.uid() = id );

-- Policy: Users can insert their own profile (needed for trigger)
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check ( auth.uid() = id );

-- =============================================
-- 4. CREATE TRIGGER FUNCTION
-- =============================================
-- Automatically create a profile when a user signs up

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

-- Add comment to function
comment on function public.handle_new_user() is 'Trigger function to create profile when user signs up';

-- =============================================
-- 5. CREATE TRIGGER
-- =============================================
-- Trigger the function when a new user is created

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- 6. CREATE INDEXES (for performance)
-- =============================================

create index if not exists profiles_email_idx on public.profiles(email);

-- =============================================
-- 7. GRANT PERMISSIONS
-- =============================================
-- Grant necessary permissions to authenticated users

grant usage on schema public to authenticated;
grant all on public.profiles to authenticated;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Run these to verify the setup:

-- Check if table exists
-- select * from public.profiles;

-- Check RLS policies
-- select * from pg_policies where tablename = 'profiles';

-- Check trigger
-- select * from pg_trigger where tgname = 'on_auth_user_created';

-- =============================================
-- SUCCESS!
-- =============================================
-- Your profiles table is now set up with:
-- ✓ Automatic profile creation on signup
-- ✓ Row Level Security enabled
-- ✓ Policies for read/update/insert
-- ✓ Indexes for performance
--
-- Next steps:
-- 1. Create a new user via signup
-- 2. Check if profile was created automatically
-- 3. Proceed with additional tables (projects, messages, etc.)
