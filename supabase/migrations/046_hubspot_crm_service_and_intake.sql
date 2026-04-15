-- Create/update HubSpot CRM service template, phased SOP plan, and intake brief.
-- Derived from: "Service Intake Form Request — HubSpot CRM Migration" (2026-04-15).

DO $$
DECLARE
  service_id uuid;
  sop1_id uuid;
  sop2_id uuid;
  sop3_id uuid;
  sop4_id uuid;
  sop5_id uuid;
  sop6_id uuid;
  sop7_id uuid;
  sop8_id uuid;
BEGIN
  -- Resolve or create canonical service template.
  SELECT id
    INTO service_id
  FROM public.service_templates
  WHERE lower(name) IN ('hubspot crm', 'hubspot crm migration', 'crm migration')
  ORDER BY created_at DESC
  LIMIT 1;

  IF service_id IS NULL THEN
    INSERT INTO public.service_templates (
      name,
      category,
      customer_description,
      estimated_hours,
      is_active
    )
    VALUES (
      'HubSpot CRM',
      'HubSpot Services',
      'Structured CRM migration from your current platform into HubSpot. We scope data volume and objects, design mapping rules, cleanse records, run sandbox tests, execute cutover, validate outcomes, and hand over with documentation and reporting.',
      80,
      true
    )
    RETURNING id INTO service_id;
  ELSE
    UPDATE public.service_templates
    SET
      name = 'HubSpot CRM',
      category = 'HubSpot Services',
      customer_description = 'Structured CRM migration from your current platform into HubSpot. We scope data volume and objects, design mapping rules, cleanse records, run sandbox tests, execute cutover, validate outcomes, and hand over with documentation and reporting.',
      estimated_hours = COALESCE(estimated_hours, 80),
      is_active = true
    WHERE id = service_id;
  END IF;

  -- Retire older labels to avoid duplicate customer-facing services.
  UPDATE public.service_templates
  SET is_active = false
  WHERE id <> service_id
    AND lower(name) IN ('hubspot crm migration', 'crm migration');

  -- Rebuild canonical 8-phase SOP/milestone plan for this template.
  DELETE FROM public.sop_tasks
  WHERE sop_id IN (
    SELECT id
    FROM public.service_sops
    WHERE service_template_id = service_id
  );

  DELETE FROM public.service_sops
  WHERE service_template_id = service_id;

  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Discovery & Audit', 'Confirm migration scope, source system, and data quality constraints.', 0)
  RETURNING id INTO sop1_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop1_id, 'Confirm source CRM, edition, and stakeholders', 'Validate source platform details and project ownership.', 0, 2, true),
    (sop1_id, 'Audit data volumes and object coverage', 'Estimate record counts and object scope for migration planning.', 1, 4, true);

  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Migration Design', 'Define mappings, history depth, exclusions, and cutover approach.', 1)
  RETURNING id INTO sop2_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop2_id, 'Design object and field mapping', 'Define source-to-HubSpot mapping including custom objects.', 0, 6, true),
    (sop2_id, 'Define history horizon and attachment strategy', 'Finalize historical depth and attachment migration policy.', 1, 3, true);

  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'HubSpot Portal Prep', 'Prepare HubSpot environment before migration execution.', 2)
  RETURNING id INTO sop3_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop3_id, 'Configure target HubSpot baseline', 'Prepare core objects, properties, and permissions for import.', 0, 4, true),
    (sop3_id, 'Prepare integration and reporting prerequisites', 'Align must-have integrations and key reporting views.', 1, 4, true);

  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Data Cleansing', 'Clean and normalize source data before migration.', 3)
  RETURNING id INTO sop4_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop4_id, 'Deduplicate and normalize records', 'Resolve duplicates and standardize core field formats.', 0, 8, true),
    (sop4_id, 'Resolve known data quality issues', 'Apply agreed remediation rules for legacy inconsistencies.', 1, 6, true);

  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Sandbox Test Migration', 'Run test migration and validate outcomes before production cutover.', 4)
  RETURNING id INTO sop5_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop5_id, 'Execute sandbox migration', 'Run trial migration against representative source data.', 0, 6, true),
    (sop5_id, 'Validate mappings and key reports', 'Confirm object integrity and top reporting outputs.', 1, 4, true);

  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Production Migration (Suprdense Switch)', 'Execute production cutover in the approved freeze window.', 5)
  RETURNING id INTO sop6_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop6_id, 'Run production cutover migration', 'Perform final migration and switch operational workflows to HubSpot.', 0, 8, true),
    (sop6_id, 'Reconnect must-have integrations', 'Activate integrations required at go-live.', 1, 4, true);

  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Validation & Delta Reconciliation', 'Reconcile variances and close migration gaps after cutover.', 6)
  RETURNING id INTO sop7_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop7_id, 'Reconcile counts and critical records', 'Validate migrated counts and high-value record integrity.', 0, 5, true),
    (sop7_id, 'Apply delta fixes and sign off data quality', 'Patch post-cutover deltas and confirm migration quality.', 1, 4, true);

  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Go-Live, Rollout & Handover', 'Final rollout, stakeholder handover, and operational closeout.', 7)
  RETURNING id INTO sop8_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop8_id, 'Deliver rollout walkthrough and stakeholder enablement', 'Review operating model with owners and sponsor.', 0, 3, true),
    (sop8_id, 'Share handover docs and close project', 'Provide final documentation and migration summary.', 1, 3, true);

  -- Rebuild intake form for canonical service.
  DELETE FROM public.intake_form_conditions
  WHERE service_template_id = service_id;

  DELETE FROM public.intake_form_fields
  WHERE service_template_id = service_id;

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, options, help_text)
  VALUES
    (service_id, 'source_crm', 'select', 'Which CRM are you migrating from?', true, 1,
      '["SuperOffice","Salesforce","Zoho CRM","Pipedrive","Microsoft Dynamics 365","Lime CRM","Upsales","Freshsales","Monday.com CRM","Copper CRM","Act! / Sage CRM","Custom / in-house","Other"]'::jsonb,
      'If you have more than one source system, pick the primary one and list the others in the notes field below.');

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, placeholder)
  VALUES
    (service_id, 'source_crm_other', 'text', 'If "Other" or "Custom", describe the source system', false, 2, 'e.g. Legacy SQL CRM built in 2011');

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, placeholder)
  VALUES
    (service_id, 'source_crm_edition', 'text', 'Source CRM edition / tier', true, 3, 'e.g. Salesforce Sales Cloud Enterprise, SuperOffice CRM Online Sales Premium');

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, validation)
  VALUES
    (service_id, 'source_crm_years', 'number', 'How many years have you been using the source CRM?', true, 4, '{"min":0,"max":50}'::jsonb),
    (service_id, 'source_crm_users', 'number', 'How many active users / seats on the source CRM?', true, 5, '{"min":1}'::jsonb);

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, options, help_text)
  VALUES
    (service_id, 'hubspot_tier', 'select', 'Target HubSpot tier', true, 6,
      '["Free","Starter","Professional","Enterprise","Not decided yet"]'::jsonb,
      'Custom objects require Enterprise. If unsure, leave this and we will confirm in discovery.');

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, validation)
  VALUES
    (service_id, 'record_count_contacts', 'number', 'Approx. number of contacts in source CRM', true, 7, '{"min":0}'::jsonb),
    (service_id, 'record_count_companies', 'number', 'Approx. number of companies / accounts', true, 8, '{"min":0}'::jsonb),
    (service_id, 'record_count_deals', 'number', 'Approx. number of deals / opportunities', true, 9, '{"min":0}'::jsonb),
    (service_id, 'record_count_activities', 'number', 'Approx. number of activities (notes/calls/meetings/tasks/emails)', false, 10, '{"min":0}'::jsonb);

  UPDATE public.intake_form_fields
  SET help_text = 'Rough order of magnitude is fine. This drives activity-migration scope.'
  WHERE service_template_id = service_id
    AND field_name = 'record_count_activities';

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, options)
  VALUES
    (service_id, 'has_custom_objects', 'radio', 'Does the source CRM use custom objects / modules / limeobjects?', true, 11, '["Yes","No","Not sure"]'::jsonb),
    (service_id, 'custom_objects_detail', 'textarea', 'If yes, list the custom objects and a short description of each', false, 12, null),
    (service_id, 'objects_in_scope', 'multiselect', 'Which objects do you want migrated?', true, 13,
      '["Contacts","Companies","Deals / Opportunities","Leads (as separate object)","Activities (notes + tasks)","Activities (calls + meetings)","Activities (logged emails)","Products / Line items","Quotes / Proposals","Tickets / Cases","Documents / Attachments","Custom objects"]'::jsonb),
    (service_id, 'history_horizon', 'select', 'How far back should we migrate historical data?', true, 14,
      '["All history","Last 5 years","Last 2 years","Open records only + last 1 year closed","Other"]'::jsonb),
    (service_id, 'closed_lost_strategy', 'radio', 'What should we do with closed-lost deals?', true, 15,
      '["Migrate all","Migrate last 2 years only","Archive in source system, do not migrate"]'::jsonb),
    (service_id, 'attachments_scope', 'radio', 'Should we migrate attachments / documents?', true, 16,
      '["Yes — all records","Yes — open deals and active companies only","No — archive in source"]'::jsonb),
    (service_id, 'sales_process_description', 'textarea', 'Describe your current sales process in 3–5 stages', true, 17, null),
    (service_id, 'mql_definition', 'textarea', 'What does a Marketing Qualified Lead mean to you today?', false, 18, null),
    (service_id, 'top_reports', 'textarea', 'List your top 5 most-used reports today', true, 19, null);

  UPDATE public.intake_form_fields
  SET default_value = 'Last 2 years'
  WHERE service_template_id = service_id
    AND field_name = 'history_horizon';

  UPDATE public.intake_form_fields
  SET help_text = 'Attachments add significant time and storage cost. Open/active only is the Superwork default.'
  WHERE service_template_id = service_id
    AND field_name = 'attachments_scope';

  UPDATE public.intake_form_fields
  SET placeholder = 'e.g. "1. Discovery → 2. Proposal → 3. Negotiation → 4. Closed Won / Lost"'
  WHERE service_template_id = service_id
    AND field_name = 'sales_process_description';

  UPDATE public.intake_form_fields
  SET help_text = 'We''ll rebuild these in a sandbox before go-live.'
  WHERE service_template_id = service_id
    AND field_name = 'top_reports';

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, options)
  VALUES
    (service_id, 'integrations_current', 'multiselect', 'Which external systems are connected to your current CRM?', true, 20,
      '["ERP / billing (Tripletex, Visma, PowerOffice, Fortnox, 24SevenOffice, Xledger, etc.)","Email (Outlook / Gmail)","Calendar","Marketing automation (Mailchimp, ActiveCampaign, Apsis, etc.)","Phone / dialer (Aircall, Dialpad, etc.)","Proposal / e-sign (GetAccept, PandaDoc, DocuSign)","Support / service desk","Data enrichment (Vainu, Bisnode, Brønnøysund, etc.)","Data warehouse / BI (BigQuery, Snowflake, Power BI, Looker)","Custom in-house system","None"]'::jsonb),
    (service_id, 'integrations_must_have_at_golive', 'textarea', 'Which integrations MUST be live at go-live?', true, 21, null),
    (service_id, 'gdpr_scope', 'radio', 'Are you subject to GDPR / Datatilsynet?', true, 22, '["Yes","No","Not sure"]'::jsonb),
    (service_id, 'data_residency', 'radio', 'Any data that must not leave the EU/EEA?', true, 23,
      '["No restrictions","All personal data must stay in EU/EEA","Specific records only — see notes"]'::jsonb),
    (service_id, 'industry_compliance', 'textarea', 'Any industry-specific regulations (finance, healthcare, public sector)?', false, 24, null),
    (service_id, 'target_golive_date', 'text', 'Target go-live date', true, 25, null),
    (service_id, 'blackout_dates', 'textarea', 'Dates to avoid (end of quarter, board meetings, product launches, etc.)', false, 26, null),
    (service_id, 'freeze_window', 'radio', 'Can you freeze the source CRM over a weekend for cutover?', true, 27,
      '["Yes — full weekend freeze is fine","Yes — but less than 24 hours","No — parallel running required"]'::jsonb),
    (service_id, 'project_owner', 'textarea', 'Client-side project owner (name + role + email)', true, 28, null),
    (service_id, 'executive_sponsor', 'textarea', 'Executive sponsor (name + role + email)', true, 29, null),
    (service_id, 'hubspot_admin', 'textarea', 'Who will be the day-to-day HubSpot admin post-migration?', true, 30, null),
    (service_id, 'source_access_granted', 'radio', 'Can you grant Superwork read-only admin access to the source CRM?', true, 31,
      '["Yes — access ready now","Yes — can be arranged","No — we will provide exports only"]'::jsonb),
    (service_id, 'known_data_quality_issues', 'textarea', 'Any known data quality issues we should know about?', false, 32, null),
    (service_id, 'additional_notes', 'textarea', 'Anything else we should know?', false, 33, null);

  UPDATE public.intake_form_fields
  SET help_text = 'Everything else will be reconnected in the first 30 days post-go-live.'
  WHERE service_template_id = service_id
    AND field_name = 'integrations_must_have_at_golive';

  UPDATE public.intake_form_fields
  SET default_value = 'Yes'
  WHERE service_template_id = service_id
    AND field_name = 'gdpr_scope';

  UPDATE public.intake_form_fields
  SET placeholder = 'YYYY-MM-DD'
  WHERE service_template_id = service_id
    AND field_name = 'target_golive_date';

  UPDATE public.intake_form_fields
  SET default_value = 'Yes — full weekend freeze is fine'
  WHERE service_template_id = service_id
    AND field_name = 'freeze_window';

  UPDATE public.intake_form_fields
  SET placeholder = 'e.g. duplicates, legacy test records, bad imports, inconsistent picklists'
  WHERE service_template_id = service_id
    AND field_name = 'known_data_quality_issues';

  UPDATE public.intake_form_fields
  SET placeholder = 'e.g. "Subscription — one per customer contract, tracks renewal date and MRR"'
  WHERE service_template_id = service_id
    AND field_name = 'custom_objects_detail';

  -- Conditional logic rules from request.
  INSERT INTO public.intake_form_conditions (
    service_template_id,
    trigger_field_name,
    trigger_value,
    action,
    target_field_names
  )
  VALUES
    (service_id, 'source_crm', 'Other', 'show', ARRAY['source_crm_other']),
    (service_id, 'source_crm', 'Custom / in-house', 'show', ARRAY['source_crm_other']),
    (service_id, 'has_custom_objects', 'Yes', 'show', ARRAY['custom_objects_detail']),
    (service_id, 'data_residency', 'Specific records only — see notes', 'show', ARRAY['additional_notes']);
END $$;

-- Verification: service template + SOP/task + intake counts.
-- Expected:
-- - service row: 1 (name = HubSpot CRM, category = HubSpot Services, is_active = true)
-- - sop_count: 8
-- - task_count: 16
-- - total_field_count: 33
-- - required_field_count: 25
-- - condition_count: 4
SELECT
  st.id,
  st.name,
  st.category,
  st.is_active,
  st.estimated_hours,
  COUNT(DISTINCT ss.id) AS sop_count,
  COUNT(DISTINCT t.id) AS task_count
FROM public.service_templates st
LEFT JOIN public.service_sops ss
  ON ss.service_template_id = st.id
LEFT JOIN public.sop_tasks t
  ON t.sop_id = ss.id
WHERE st.name = 'HubSpot CRM'
GROUP BY st.id, st.name, st.category, st.is_active, st.estimated_hours;

SELECT
  COUNT(*) FILTER (WHERE f.is_required) AS required_field_count,
  COUNT(*) AS total_field_count
FROM public.intake_form_fields f
JOIN public.service_templates st
  ON st.id = f.service_template_id
WHERE st.name = 'HubSpot CRM';

SELECT
  COUNT(*) AS condition_count
FROM public.intake_form_conditions c
JOIN public.service_templates st
  ON st.id = c.service_template_id
WHERE st.name = 'HubSpot CRM';
