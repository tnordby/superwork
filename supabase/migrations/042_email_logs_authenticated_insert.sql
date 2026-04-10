-- sendEmail() uses the user-scoped Supabase server client to append rows after Resend calls.
-- RLS was enabled on email_logs with only a non-selectable admin policy; without INSERT, logging failed silently.

create policy "Authenticated users can insert email logs"
  on public.email_logs
  for insert
  to authenticated
  with check (true);

comment on policy "Authenticated users can insert email logs" on public.email_logs is
  'Allows the app to record outbound email metadata when sending with the user JWT.';
