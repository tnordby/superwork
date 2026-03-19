-- Projects from approved quotes: attach workspace, set committed cost (minor units from quote major-unit prices).

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
  limit 1;

  if workspace_uuid is null then
    raise exception 'No workspace found for quote customer';
  end if;

  amount_cents := round(coalesce(quote_record.final_price, quote_record.estimated_price, 0::numeric) * 100);

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

  update public.quotes
  set project_id = new_project_id
  where id = quote_id_param;

  if quote_record.assigned_lead_user_id is not null then
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
      quote_record.reviewed_by_user_id
    );
  end if;

  return new_project_id;
end;
$$;
