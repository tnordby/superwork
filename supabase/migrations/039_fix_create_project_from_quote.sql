-- Quote approval: resolve client workspace for owners OR members; reuse existing linked project when valid.

create or replace function public.create_project_from_quote(quote_id_param uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project_id uuid;
  quote_record record;
  workspace_uuid uuid;
  amount_cents numeric;
  existing_project_owner uuid;
begin
  select * into quote_record
  from public.quotes
  where id = quote_id_param
    and status = 'approved';

  if not found then
    raise exception 'Quote not found or not approved';
  end if;

  select w.id into workspace_uuid
  from public.workspaces w
  where w.owner_id = quote_record.user_id
    and w.type = 'client'
  order by w.created_at asc
  limit 1;

  if workspace_uuid is null then
    select wm.workspace_id into workspace_uuid
    from public.workspace_members wm
    inner join public.workspaces w on w.id = wm.workspace_id
    where wm.user_id = quote_record.user_id
      and w.type = 'client'
    order by wm.invited_at asc
    limit 1;
  end if;

  if workspace_uuid is null then
    raise exception 'No workspace found for quote customer';
  end if;

  amount_cents := round(coalesce(quote_record.final_price, quote_record.estimated_price, 0::numeric) * 100);

  new_project_id := null;

  if quote_record.project_id is not null then
    select p.user_id into existing_project_owner
    from public.projects p
    where p.id = quote_record.project_id;

    if found and existing_project_owner = quote_record.user_id then
      new_project_id := quote_record.project_id;

      update public.projects
      set
        workspace_id = workspace_uuid,
        name = quote_record.title,
        description = coalesce(quote_record.description, description),
        category = quote_record.category,
        service_type = quote_record.service_type,
        cost = amount_cents,
        assignee = (select email from auth.users where id = quote_record.assigned_lead_user_id)
      where id = new_project_id;
    elsif found and existing_project_owner is distinct from quote_record.user_id then
      raise exception 'Quote is linked to a project that does not belong to this customer';
    end if;
  end if;

  if new_project_id is null then
    insert into public.projects (
      user_id,
      workspace_id,
      name,
      description,
      category,
      service_type,
      status,
      progress,
      assignee,
      cost
    )
    values (
      quote_record.user_id,
      workspace_uuid,
      quote_record.title,
      quote_record.description,
      quote_record.category,
      quote_record.service_type,
      'planned',
      0,
      (select email from auth.users where id = quote_record.assigned_lead_user_id),
      amount_cents
    )
    returning id into new_project_id;
  end if;

  update public.quotes
  set project_id = new_project_id
  where id = quote_id_param;

  if quote_record.assigned_lead_user_id is not null then
    if not exists (
      select 1 from public.project_assignments pa
      where pa.project_id = new_project_id
        and pa.user_id = quote_record.assigned_lead_user_id
        and pa.removed_at is null
    ) then
      insert into public.project_assignments (
        project_id,
        user_id,
        role,
        assigned_by_user_id
      )
      values (
        new_project_id,
        quote_record.assigned_lead_user_id,
        'lead',
        coalesce(quote_record.reviewed_by_user_id, quote_record.user_id)
      );
    end if;
  end if;

  return new_project_id;
end;
$$;
