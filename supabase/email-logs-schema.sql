-- =============================================
-- EMAIL LOGS TABLE
-- =============================================
-- Track all emails sent from the system
-- Run this in Supabase SQL Editor

create table if not exists public.email_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  recipient_email text not null,
  email_type text not null, -- 'welcome', 'password_reset', 'project_created', 'project_status_update', etc.
  subject text not null,
  status text not null default 'sent', -- 'sent', 'failed', 'bounced'
  external_id text, -- Resend email ID
  error_message text,
  metadata jsonb, -- Additional context (project_id, etc.)
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.email_logs is 'Log of all emails sent from the system';

-- Enable RLS
alter table public.email_logs enable row level security;

-- RLS Policies - Only admins can view email logs (for now, restrict to service role)
-- Users cannot view email logs directly
create policy "Service role can manage email logs"
  on public.email_logs
  for all
  using ( auth.jwt() ->> 'role' = 'service_role' );

-- Indexes for performance
create index if not exists email_logs_user_id_idx on public.email_logs(user_id);
create index if not exists email_logs_email_type_idx on public.email_logs(email_type);
create index if not exists email_logs_status_idx on public.email_logs(status);
create index if not exists email_logs_sent_at_idx on public.email_logs(sent_at desc);
create index if not exists email_logs_recipient_email_idx on public.email_logs(recipient_email);

-- Grant permissions to authenticated users (will be restricted by RLS)
grant usage on schema public to authenticated;
grant select on public.email_logs to authenticated;

-- =============================================
-- SUCCESS!
-- =============================================
-- Email logs table is now set up with:
-- ✓ Tracks all sent emails
-- ✓ Links to users when applicable
-- ✓ Stores email type, status, and metadata
-- ✓ RLS enabled (service role only for v1)
-- ✓ Proper indexes for querying
