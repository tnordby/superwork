-- Allow consultants to read projects they are assigned to.
--
-- Messaging inbox endpoints join `conversations` -> `projects(name)`.
-- Without consultant read access to `public.projects`, the join fails and
-- causes inbox conversation loads to error (500) due to RLS.

create policy "Consultants can view assigned projects"
  on public.projects for select
  using (
    exists (
      select 1
      from public.project_assignments pa
      where pa.project_id = projects.id
        and pa.user_id = auth.uid()
        and pa.removed_at is null
    )
  );

