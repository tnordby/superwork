-- Create/update HubSpot Data Onboarding service template, milestone plan, and intake form.
-- Source: Service-Intake-HubSpot-Data-Hub-Onboarding.md (2026-04-15)

DO $$
DECLARE
  service_id uuid;
  sop_pre_id uuid;
  sop1_id uuid;
  sop2_id uuid;
  sop3_id uuid;
  sop4_id uuid;
  sop5_id uuid;
  sop6_id uuid;
BEGIN
  -- Resolve or create canonical service template.
  SELECT id
    INTO service_id
  FROM public.service_templates
  WHERE lower(name) IN ('hubspot data onboarding', 'hubspot data hub onboarding', 'hubspot data hub setup')
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
      'HubSpot Data Onboarding',
      'HubSpot Services',
      'Enterprise-grade Data Hub onboarding to connect source systems, enforce governance, improve data quality, and launch scalable reporting and automation.',
      90,
      true
    )
    RETURNING id INTO service_id;
  ELSE
    UPDATE public.service_templates
    SET
      name = 'HubSpot Data Onboarding',
      category = 'HubSpot Services',
      customer_description = 'Enterprise-grade Data Hub onboarding to connect source systems, enforce governance, improve data quality, and launch scalable reporting and automation.',
      estimated_hours = COALESCE(estimated_hours, 90),
      is_active = true
    WHERE id = service_id;
  END IF;

  -- Retire older labels to avoid duplicate customer-facing services.
  UPDATE public.service_templates
  SET is_active = false
  WHERE id <> service_id
    AND lower(name) IN ('hubspot data hub onboarding', 'hubspot data hub setup');

  -- Rebuild SOP/task milestone template.
  DELETE FROM public.sop_tasks
  WHERE sop_id IN (
    SELECT id
    FROM public.service_sops
    WHERE service_template_id = service_id
  );

  DELETE FROM public.service_sops
  WHERE service_template_id = service_id;

  -- Pre-onboarding gate
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    'Pre-Onboarding Checklist',
    'Gating checklist that must be completed before Phase 1 starts.',
    0
  )
  RETURNING id INTO sop_pre_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop_pre_id, 'Confirm Data Hub tier and feature gating', 'Validate licensed tier and identify Enterprise-only requirements.', 0, 1, true),
    (sop_pre_id, 'Confirm stakeholder owners and access', 'Finalize RevOps lead, HubSpot super admin, and technical integration contact.', 1, 1, true),
    (sop_pre_id, 'Confirm data source inventory', 'Document systems, warehouses, middleware, and source-of-truth map inputs.', 2, 1, true);

  -- 1) Foundation
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Foundation', 'Account, tier, source-of-truth map, and data quality baseline.', 1)
  RETURNING id INTO sop1_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop1_id, 'Run data audit and record volume baseline', 'Assess volume, quality risks, and migration constraints.', 0, 4, true),
    (sop1_id, 'Define source-of-truth and sync principles', 'Agree canonical source per data domain and sync direction.', 1, 4, true);

  -- 2) Core Setup
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Core Setup', 'Users, teams, permissions, tracking, and baseline defaults.', 2)
  RETURNING id INTO sop2_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop2_id, 'Configure users, teams, and ownership model', 'Set ownership, routing, and operational roles.', 0, 3, true),
    (sop2_id, 'Configure governance defaults and standards', 'Apply naming conventions, dictionary baseline, and field standards.', 1, 3, true);

  -- 3) Data Sync & Integration
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Data Sync & Integration', 'Connect systems, configure mappings, and run initial sync.', 3)
  RETURNING id INTO sop3_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop3_id, 'Implement source integrations and mappings', 'Configure integrations and field-level mapping rules.', 0, 8, true),
    (sop3_id, 'Run initial sync and reconciliation', 'Validate sync quality and resolve critical mismatches.', 1, 6, true);

  -- 4) Data Quality Automation
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Data Quality Automation', 'Command Center, normalization, deduplication, and alerts.', 4)
  RETURNING id INTO sop4_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop4_id, 'Configure quality rules and standardization', 'Set normalization, validation, and enrichment controls.', 0, 6, true),
    (sop4_id, 'Implement duplicate and anomaly monitoring', 'Set dedupe logic, alerting, and operational ownership.', 1, 4, true);

  -- 5) Workflow Automation
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Workflow Automation', 'Routing, lifecycle logic, custom code, and webhooks.', 5)
  RETURNING id INTO sop5_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop5_id, 'Build priority routing and lifecycle automation', 'Implement deterministic routing, lifecycle updates, and handoffs.', 0, 6, true),
    (sop5_id, 'Implement programmable automation and webhooks', 'Deploy custom-code actions and external notifications as needed.', 1, 6, true);

  -- 6) Reporting & Launch
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Reporting & Launch', 'Data Studio datasets, dashboards, training, and go-live.', 6)
  RETURNING id INTO sop6_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop6_id, 'Build reporting model and dashboards', 'Deliver cross-source reporting views and KPI baselines.', 0, 5, true),
    (sop6_id, 'Launch, handover, and adoption enablement', 'Train owners, confirm runbook, and complete launch checklist.', 1, 4, true);

  -- Enterprise-only optional task bundle.
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop6_id, 'Enterprise option set: custom objects, sandbox, field-level permissions, sensitive data, audit logs, reverse ETL', 'Apply Enterprise-only controls and capabilities where licensed and approved.', 2, 4, false);

  -- Rebuild intake form for canonical service.
  DELETE FROM public.intake_form_conditions
  WHERE service_template_id = service_id;

  DELETE FROM public.intake_form_fields
  WHERE service_template_id = service_id;

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, options, help_text)
  VALUES
    (service_id, 'data_hub_tier', 'select', 'Which Data Hub tier are you on (or planning to buy)?', true, 1, '["Free","Starter","Professional","Enterprise","Not decided yet"]'::jsonb, 'Custom field mappings require Starter+. Programmable automation, Data Studio, and Data Quality automation require Professional+. Custom objects, native warehouse integrations, Reverse ETL, sandboxes, and field-level permissions require Enterprise.'),
    (service_id, 'coming_from_operations_hub', 'radio', 'Are you an existing Operations Hub customer migrating to Data Hub?', true, 2, '["Yes — already migrated automatically","Yes — migration in progress","No — new to Data Hub / Operations Hub"]'::jsonb, null),
    (service_id, 'other_hubs_in_use', 'multiselect', 'Which other HubSpot Hubs are in use?', true, 3, '["Marketing Hub","Sales Hub","Service Hub","Content Hub","Commerce Hub","None — Data Hub only"]'::jsonb, null),
    (service_id, 'primary_use_cases', 'multiselect', 'Which Data Hub use cases are priority for this engagement?', true, 4, '["Unified data foundation across systems","Data quality automation at scale","Cross-source reporting via Data Studio","Complex workflow orchestration (custom code)","Warehouse integration (Snowflake / BigQuery / etc.)","AI enrichment via Data Agent / Smart Properties","Product-led growth signal routing","Post-M&A CRM consolidation","Replace Zapier / Workato / middleware","Reverse ETL to warehouse"]'::jsonb, null),
    (service_id, 'source_systems', 'multiselect', 'Which external source systems need to connect to HubSpot?', true, 5, '["Salesforce","Microsoft Dynamics 365","NetSuite","SAP","Pipedrive","Zoho","Other CRM","Snowflake","Google BigQuery","AWS Redshift","Databricks","AWS S3","Google Sheets","Excel / OneDrive","Stripe / Chargebee","ERP (Tripletex / Visma / Fortnox / 24SevenOffice / Xledger)","Product analytics (Mixpanel / Amplitude / Heap)","Marketing automation (Mailchimp / Marketo / Pardot)","Data enrichment (Clearbit / Vainu / Bisnode)","Other — see notes"]'::jsonb, null),
    (service_id, 'source_systems_other', 'textarea', 'List any source systems not covered above', false, 6, null, null),
    (service_id, 'source_of_truth_map', 'textarea', 'For each core data type, which system is the source of truth?', true, 7, null, 'Every integrated field needs a designated source-of-truth to avoid bidirectional sync conflicts.'),
    (service_id, 'data_sync_direction', 'textarea', 'For each source system, what sync direction is required?', true, 8, null, null),
    (service_id, 'salesforce_in_scope', 'radio', 'Is Salesforce in scope?', true, 9, '["Yes","No"]'::jsonb, null),
    (service_id, 'salesforce_lead_contact_strategy', 'select', 'If Salesforce is in scope, how should we handle Lead vs Contact?', false, 10, '["Sync Salesforce Leads + Contacts separately using Lead ID / Contact ID properties","Sync Salesforce Contacts only — Leads stay in SF","Convert all SF Leads to HubSpot Contacts with Lifecycle = Lead","Not sure — need Superwork to recommend"]'::jsonb, 'The HubSpot one-contact-per-email vs Salesforce dual-object model is the #1 source of sync issues. Decide early.'),
    (service_id, 'salesforce_integration_user', 'radio', 'Will you create a dedicated Salesforce integration user?', false, 11, '["Yes — already created","Yes — will create before kickoff","No — plan to use a personal account","N/A"]'::jsonb, 'Personal accounts break the integration when that employee leaves. Dedicated user strongly recommended.'),
    (service_id, 'warehouse_in_scope', 'radio', 'Is a data warehouse integration in scope?', true, 12, '["Yes — Snowflake","Yes — BigQuery","Yes — AWS S3","Yes — Redshift / Databricks (middleware required)","Yes — multiple","No"]'::jsonb, 'Native bidirectional warehouse integration requires Enterprise. Redshift / Databricks require Fivetran / Airbyte.'),
    (service_id, 'reverse_etl_use_cases', 'textarea', 'If Reverse ETL is needed, what should flow back to the warehouse?', false, 13, null, null),
    (service_id, 'custom_objects_scope', 'radio', 'Do you need HubSpot Custom Objects?', true, 14, '["Yes — definitely","Maybe — want Superwork to evaluate","No"]'::jsonb, 'Requires Enterprise. Superwork applies the 3-question test (own properties? own associations? own pipeline?) before recommending.'),
    (service_id, 'custom_objects_detail', 'textarea', 'If yes, describe the custom objects you need', false, 15, null, null),
    (service_id, 'data_studio_scope', 'textarea', 'What Data Studio use cases are in scope?', false, 16, null, 'Data Studio requires Professional+. 10M external rows on Pro, 30M on Enterprise.'),
    (service_id, 'data_agent_scope', 'textarea', 'Any planned Data Agent / Smart Property use cases?', false, 17, null, 'Data Agent consumes HubSpot Credits — confirm credit balance before go-live.'),
    (service_id, 'programmable_automation_scope', 'multiselect', 'Any programmable automation (custom code) needs?', false, 18, '["Weighted / round-robin lead rotation","Phone number normalization to E.164","Programmatic duplicate detection / merge","Deal renewal automation with line-item copy","External email validation API calls","Company enrichment via third-party API","Custom commission calculations","Cross-system unsubscribe sync","Webhook-based notifications to external systems","Other"]'::jsonb, 'Node.js and Python supported. Max 20s execution, 128MB memory, 65,000 char output.'),
    (service_id, 'current_data_quality', 'select', 'Honest assessment of current data quality', true, 19, '["Clean — minor cleanup needed","Mixed — significant duplicates or formatting issues","Poor — major cleanup required before sync","Not sure — want Superwork to audit"]'::jsonb, null),
    (service_id, 'known_data_issues', 'multiselect', 'Known data issues we should plan for', true, 20, '["Duplicate contacts (same email)","Duplicate companies (same domain)","Inconsistent country names / formats","Inconsistent phone formats","Free-text fields that should be dropdowns","Stale / untouched >2 years records","Bounced email addresses","Missing lifecycle stages","Missing contact owners","Records owned by former employees","None of the above"]'::jsonb, null),
    (service_id, 'record_volumes', 'textarea', 'Approximate record volumes in the primary system', true, 21, null, null),
    (service_id, 'compliance_scope', 'multiselect', 'Compliance requirements', true, 22, '["GDPR / Datatilsynet","Personal Information (PI)","Personally Identifiable Information (PII)","Protected Health Information (PHI)","Financial data / SOX","Industry-specific (specify in notes)","None"]'::jsonb, 'PI/PII/PHI flagging requires Enterprise Sensitive Data designation. The flag is permanent.'),
    (service_id, 'data_residency', 'radio', 'Any data residency requirements?', true, 23, '["No restrictions","All personal data must stay in EU/EEA","Specific records only — see notes"]'::jsonb, null),
    (service_id, 'governance_maturity', 'select', 'How mature is your current data governance?', true, 24, '["None — no formal process","Informal — individual stewards but no documented rules","Documented — data dictionary + naming conventions exist","Mature — governance committee + monitored KPIs"]'::jsonb, null),
    (service_id, 'governance_in_scope', 'multiselect', 'Do you want Superwork to set up the governance framework?', true, 25, '["Data governance committee + stewards","Naming conventions + data dictionary","Field-level permissions (Enterprise)","Sensitive Data designation (Enterprise)","Data Quality KPIs + weekly digest","Audit log + alerts (Enterprise)","None — we handle governance internally"]'::jsonb, null),
    (service_id, 'middleware_in_use', 'multiselect', 'Is any middleware currently in use (or planned)?', true, 26, '["Zapier","Make (Integromat)","Workato","Celigo","Boomi","Fivetran","Airbyte","Tray.io","Custom scripts / in-house ETL","None"]'::jsonb, 'Part of our scoping is deciding what stays in middleware vs what moves to native Data Hub.'),
    (service_id, 'middleware_consolidation_goal', 'radio', 'Do you want to reduce / replace middleware as part of this engagement?', false, 27, '["Yes — replace as much as possible with native Data Hub","Yes — replace specific use cases only (note below)","No — keep middleware as-is","N/A — no middleware today"]'::jsonb, null),
    (service_id, 'sandbox_available', 'radio', 'Is a HubSpot sandbox available for testing?', true, 28, '["Yes — sandbox ready","Yes — we have Enterprise but have not set up a sandbox","No — Pro tier, we will use a staging portal","Not sure"]'::jsonb, null),
    (service_id, 'rollout_timeline', 'select', 'Preferred rollout cadence', true, 29, '["Standard 6–8 weeks (Professional implementation)","Standard 8–12 weeks (Enterprise implementation)","Accelerated — time-sensitive go-live","Phased over 6+ months (multi-phase plan)"]'::jsonb, null),
    (service_id, 'target_golive_date', 'text', 'Target go-live date for Phase 1', true, 30, null, null),
    (service_id, 'blackout_dates', 'textarea', 'Dates to avoid (end of quarter, launches, audits, etc.)', false, 31, null, null),
    (service_id, 'revops_lead', 'textarea', 'RevOps / Data lead (name + role + email)', true, 32, null, null),
    (service_id, 'hubspot_super_admin', 'textarea', 'HubSpot Super Admin (name + role + email)', true, 33, null, null),
    (service_id, 'technical_contact', 'textarea', 'Technical contact for warehouse / API access (name + role + email)', false, 34, null, null),
    (service_id, 'dependent_teams', 'multiselect', 'Which teams depend on this data?', true, 35, '["Marketing","Sales","Customer Success","Service / Support","Finance","Product","Data / Analytics","Executive / Leadership","Other"]'::jsonb, null),
    (service_id, 'success_metrics', 'textarea', 'How will you measure success of this engagement?', true, 36, null, null),
    (service_id, 'additional_notes', 'textarea', 'Anything else we should know?', false, 37, null, null);

  -- Optional defaults/placeholders.
  UPDATE public.intake_form_fields
  SET placeholder = 'Contacts: HubSpot\nCompanies: HubSpot (enriched from Bronnoysund)\nDeals: HubSpot\nBilling / Invoices: NetSuite\nProduct usage: Snowflake\nLead source: Marketing Hub'
  WHERE service_template_id = service_id
    AND field_name = 'source_of_truth_map';

  UPDATE public.intake_form_fields
  SET placeholder = 'Salesforce: two-way\nSnowflake: two-way (Reverse ETL for enriched scores)\nGoogle Sheets: one-way into HubSpot\nStripe: one-way into HubSpot'
  WHERE service_template_id = service_id
    AND field_name = 'data_sync_direction';

  UPDATE public.intake_form_fields
  SET placeholder = 'e.g. churn risk scores, predictive deal scores, product usage segments, consolidated attribution data'
  WHERE service_template_id = service_id
    AND field_name = 'reverse_etl_use_cases';

  UPDATE public.intake_form_fields
  SET placeholder = 'Subscription — per-customer contract, tracks renewal date, MRR, plan tier.\nLocation — multi-site customers with per-site contacts.\nAsset — serviced equipment units.'
  WHERE service_template_id = service_id
    AND field_name = 'custom_objects_detail';

  UPDATE public.intake_form_fields
  SET placeholder = 'Blend HubSpot Deals with Snowflake subscription data for ARR reporting. Blend contacts with Google Sheets of territory assignments.'
  WHERE service_template_id = service_id
    AND field_name = 'data_studio_scope';

  UPDATE public.intake_form_fields
  SET placeholder = 'AI property to extract competitor mentioned from call transcripts. Smart property to research latest funding round on account records.'
  WHERE service_template_id = service_id
    AND field_name = 'data_agent_scope';

  UPDATE public.intake_form_fields
  SET placeholder = 'Contacts: 85000\nCompanies: 12000\nDeals: 3500 open / 45000 total\nTickets: 20000'
  WHERE service_template_id = service_id
    AND field_name = 'record_volumes';

  UPDATE public.intake_form_fields
  SET placeholder = 'YYYY-MM-DD'
  WHERE service_template_id = service_id
    AND field_name = 'target_golive_date';

  UPDATE public.intake_form_fields
  SET placeholder = 'Duplicate rate <3%, property fill rate >90%, SLA compliance visible in one dashboard, monthly Data Quality digest reviewed by RevOps committee.'
  WHERE service_template_id = service_id
    AND field_name = 'success_metrics';

  -- Conditional logic rules from request.
  INSERT INTO public.intake_form_conditions (
    service_template_id,
    trigger_field_name,
    trigger_value,
    action,
    target_field_names
  )
  VALUES
    (service_id, 'source_systems', 'Other — see notes', 'show', ARRAY['source_systems_other']),
    (service_id, 'salesforce_in_scope', 'Yes', 'show', ARRAY['salesforce_lead_contact_strategy', 'salesforce_integration_user']),
    (service_id, 'warehouse_in_scope', 'Yes — Snowflake', 'show', ARRAY['reverse_etl_use_cases']),
    (service_id, 'warehouse_in_scope', 'Yes — BigQuery', 'show', ARRAY['reverse_etl_use_cases']),
    (service_id, 'warehouse_in_scope', 'Yes — multiple', 'show', ARRAY['reverse_etl_use_cases']),
    (service_id, 'custom_objects_scope', 'Yes — definitely', 'show', ARRAY['custom_objects_detail']),
    (service_id, 'middleware_in_use', 'Zapier', 'show', ARRAY['middleware_consolidation_goal']),
    (service_id, 'data_residency', 'Specific records only — see notes', 'show', ARRAY['additional_notes']);
END $$;

-- Verification
-- Expected:
-- - service row: 1 (name = HubSpot Data Onboarding, category = HubSpot Services, is_active = true)
-- - sop_count: 7 (1 pre-onboarding + 6 phases)
-- - total_task_count: 16
-- - total_field_count: 37
-- - required_field_count: 28
-- - condition_count: 8
SELECT
  st.id,
  st.name,
  st.category,
  st.is_active,
  st.estimated_hours,
  COUNT(DISTINCT ss.id) AS sop_count,
  COUNT(DISTINCT t.id) AS total_task_count
FROM public.service_templates st
LEFT JOIN public.service_sops ss ON ss.service_template_id = st.id
LEFT JOIN public.sop_tasks t ON t.sop_id = ss.id
WHERE st.name = 'HubSpot Data Onboarding'
GROUP BY st.id, st.name, st.category, st.is_active, st.estimated_hours;

SELECT
  COUNT(*) FILTER (WHERE f.is_required) AS required_field_count,
  COUNT(*) AS total_field_count
FROM public.intake_form_fields f
JOIN public.service_templates st ON st.id = f.service_template_id
WHERE st.name = 'HubSpot Data Onboarding';

SELECT
  COUNT(*) AS condition_count
FROM public.intake_form_conditions c
JOIN public.service_templates st ON st.id = c.service_template_id
WHERE st.name = 'HubSpot Data Onboarding';
