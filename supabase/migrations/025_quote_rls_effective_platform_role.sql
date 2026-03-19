-- Use effective_platform_role() so DB-assigned roles and legacy JWT `pm` / `project_manager` both work.

drop policy if exists "Admins and PMs can view all quotes" on public.quotes;
create policy "Admins and PMs can view all quotes"
  on public.quotes for select
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager'));

drop policy if exists "PMs can update quotes" on public.quotes;
create policy "PMs can update quotes"
  on public.quotes for update
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager'));

drop policy if exists "Admins and PMs can view all assignments" on public.project_assignments;
create policy "Admins and PMs can view all assignments"
  on public.project_assignments for select
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager'));

drop policy if exists "PMs can create assignments" on public.project_assignments;
create policy "PMs can create assignments"
  on public.project_assignments for insert
  with check (public.effective_platform_role() in ('admin', 'pm', 'project_manager'));

drop policy if exists "PMs can update assignments" on public.project_assignments;
create policy "PMs can update assignments"
  on public.project_assignments for update
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager'));

drop policy if exists "PMs can view all line items" on public.quote_line_items;
create policy "PMs can view all line items"
  on public.quote_line_items for select
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager'));

drop policy if exists "PMs can manage line items" on public.quote_line_items;
create policy "PMs can manage line items"
  on public.quote_line_items for all
  using (public.effective_platform_role() in ('admin', 'pm', 'project_manager'))
  with check (public.effective_platform_role() in ('admin', 'pm', 'project_manager'));
