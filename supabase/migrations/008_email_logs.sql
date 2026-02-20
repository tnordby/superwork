-- Email logs table for tracking all sent emails
create table if not exists public.email_logs (
  id uuid default gen_random_uuid() primary key,
  recipient_email text not null,
  template_id text not null,
  subject text not null,
  status text not null default 'sent',
  resend_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.email_logs is 'Log of all emails sent via Resend';
comment on column public.email_logs.recipient_email is 'Email address of the recipient';
comment on column public.email_logs.template_id is 'Template identifier (e.g., AUTH-01, BILL-03)';
comment on column public.email_logs.subject is 'Email subject line';
comment on column public.email_logs.status is 'Email status: sent, delivered, failed, bounced, complained';
comment on column public.email_logs.resend_id is 'Resend message ID for tracking';
comment on column public.email_logs.metadata is 'Additional context (project_id, user_id, etc.)';

-- Enable RLS
alter table public.email_logs enable row level security;

-- Only admins can view email logs (for now)
create policy "Admins can view email logs"
  on public.email_logs for select
  using (false); -- Adjust this when admin roles are implemented

-- Indexes for performance
create index if not exists email_logs_recipient_email_idx on public.email_logs(recipient_email);
create index if not exists email_logs_template_id_idx on public.email_logs(template_id);
create index if not exists email_logs_status_idx on public.email_logs(status);
create index if not exists email_logs_created_at_idx on public.email_logs(created_at desc);
create index if not exists email_logs_resend_id_idx on public.email_logs(resend_id);

-- Updated_at trigger
create trigger set_updated_at before update on public.email_logs
  for each row execute procedure public.handle_updated_at();
