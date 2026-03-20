-- Fix: "infinite recursion detected in policy for relation assets"
--
-- Cycle was: assets SELECT policy checked asset_shares → asset_shares SELECT policy
-- queried assets → assets SELECT evaluated again → loop (e.g. on INSERT ... RETURNING).
--
-- Replace the direct asset_shares subquery on assets with a SECURITY DEFINER helper
-- that reads asset_shares as the function owner (bypasses RLS on that read only).

create or replace function public.asset_share_exists_for_user(p_asset_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.asset_shares as s
    where s.asset_id = p_asset_id
      and s.shared_with_user_id = (select auth.uid())
  );
$$;

revoke all on function public.asset_share_exists_for_user(uuid) from public;
grant execute on function public.asset_share_exists_for_user(uuid) to authenticated;
grant execute on function public.asset_share_exists_for_user(uuid) to service_role;

drop policy if exists "Users can view assets in their workspaces" on public.assets;

create policy "Users can view assets in their workspaces"
  on public.assets for select
  using (
    auth.uid() = user_id
    or (
      workspace_id is not null
      and (
        exists (
          select 1 from public.workspace_members
          where workspace_members.workspace_id = assets.workspace_id
            and workspace_members.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspaces
          where workspaces.id = assets.workspace_id
            and workspaces.owner_id = auth.uid()
        )
      )
    )
    or public.asset_share_exists_for_user(assets.id)
  );
