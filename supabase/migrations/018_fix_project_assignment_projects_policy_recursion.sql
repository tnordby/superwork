-- Break recursive RLS dependency between:
-- - projects select policy (consultant access via project_assignments)
-- - project_assignments select policy (which referenced projects)
--
-- Previous loop:
--   projects policy -> project_assignments -> projects policy
-- This caused: "infinite recursion detected in policy for relation projects".

-- Replace recursive assignment select policy with non-recursive one.
drop policy if exists "Users can view assignments for their projects" on public.project_assignments;

create policy "Users can view assignments for their projects"
  on public.project_assignments for select
  using (
    -- Assigned consultant/contributor can always read their own assignment rows.
    user_id = auth.uid()
    -- Assigner can inspect what they assigned.
    or assigned_by_user_id = auth.uid()
    -- Admin/PM can read all assignments.
    or (current_setting('request.jwt.claims', true)::json->>'role') in ('admin', 'pm')
  );

