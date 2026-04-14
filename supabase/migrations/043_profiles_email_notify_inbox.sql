-- Opt-out for new inbox message notification emails (per user).
alter table public.profiles
  add column if not exists email_notify_inbox_messages boolean not null default true;

comment on column public.profiles.email_notify_inbox_messages is
  'When false, new inbox message emails are not sent to this user.';
