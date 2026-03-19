-- Allow consultants (assigned to a project) to view/create/update conversation threads
-- and create/view messages within those conversations.
--
-- Without this, the existing customer-only RLS prevents consultants from loading or sending
-- messages in the inbox.

-- =============================================
-- 1) CONVERSATIONS policies
-- =============================================

drop policy if exists "Users can view own conversations" on public.conversations;
create policy "Users can view own conversations"
  on public.conversations for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.project_assignments pa
      where pa.project_id = conversations.project_id
        and pa.user_id = auth.uid()
        and pa.removed_at is null
    )
    or exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and u.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

drop policy if exists "Users can create own conversations" on public.conversations;
create policy "Users can create own conversations"
  on public.conversations for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.project_assignments pa
      where pa.project_id = conversations.project_id
        and pa.user_id = auth.uid()
        and pa.removed_at is null
    )
    or exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and u.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

drop policy if exists "Users can update own conversations" on public.conversations;
create policy "Users can update own conversations"
  on public.conversations for update
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.project_assignments pa
      where pa.project_id = conversations.project_id
        and pa.user_id = auth.uid()
        and pa.removed_at is null
    )
    or exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and u.raw_user_meta_data->>'role' in ('admin', 'pm')
    )
  );

-- =============================================
-- 2) MESSAGES policies
-- =============================================

drop policy if exists "Users can view messages in their conversations" on public.messages;
create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.user_id = auth.uid()
          or exists (
            select 1
            from public.project_assignments pa
            where pa.project_id = c.project_id
              and pa.user_id = auth.uid()
              and pa.removed_at is null
          )
          or exists (
            select 1
            from auth.users u
            where u.id = auth.uid()
              and u.raw_user_meta_data->>'role' in ('admin', 'pm')
          )
        )
    )
  );

drop policy if exists "Users can create messages in their conversations" on public.messages;
create policy "Users can create messages in their conversations"
  on public.messages for insert
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.user_id = auth.uid()
          or exists (
            select 1
            from public.project_assignments pa
            where pa.project_id = c.project_id
              and pa.user_id = auth.uid()
              and pa.removed_at is null
          )
          or exists (
            select 1
            from auth.users u
            where u.id = auth.uid()
              and u.raw_user_meta_data->>'role' in ('admin', 'pm')
          )
        )
    )
  );

