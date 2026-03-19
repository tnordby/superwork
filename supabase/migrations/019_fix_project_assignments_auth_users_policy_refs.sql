-- Remove remaining project_assignments policies that query auth.users directly.
-- These can fail at runtime with: "permission denied for table users".
--
-- Replace with JWT-claim role checks to keep behavior while avoiding table access.

-- SELECT (admin/pm global visibility)
drop policy if exists "Admins and PMs can view all assignments" on public.project_assignments;
create policy "Admins and PMs can view all assignments"
  on public.project_assignments for select
  using (
    (current_setting('request.jwt.claims', true)::json->>'role') in ('admin', 'pm')
  );

-- INSERT (admin/pm only)
drop policy if exists "PMs can create assignments" on public.project_assignments;
create policy "PMs can create assignments"
  on public.project_assignments for insert
  with check (
    (current_setting('request.jwt.claims', true)::json->>'role') in ('admin', 'pm')
  );

-- UPDATE (admin/pm only)
drop policy if exists "PMs can update assignments" on public.project_assignments;
create policy "PMs can update assignments"
  on public.project_assignments for update
  using (
    (current_setting('request.jwt.claims', true)::json->>'role') in ('admin', 'pm')
  );

