-- Create/update HubSpot Service Onboarding service template, SOP plan, and intake form.
-- Source: Service-Intake-HubSpot-Service-Hub-Setup.md (2026-04-15)

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
  sop7_id uuid;
  sop8_id uuid;
  sop9_id uuid;
  sop10_id uuid;
BEGIN
  -- Resolve or create canonical service template.
  SELECT id
    INTO service_id
  FROM public.service_templates
  WHERE lower(name) IN ('hubspot service onboarding', 'hubspot service hub setup')
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
      'HubSpot Service Onboarding',
      'HubSpot Services',
      'Structured Service Hub setup and configuration covering ticket model, inbox/channels, knowledge base, SLAs, automation, and reporting so your support operation can run consistently at go-live.',
      70,
      true
    )
    RETURNING id INTO service_id;
  ELSE
    UPDATE public.service_templates
    SET
      name = 'HubSpot Service Onboarding',
      category = 'HubSpot Services',
      customer_description = 'Structured Service Hub setup and configuration covering ticket model, inbox/channels, knowledge base, SLAs, automation, and reporting so your support operation can run consistently at go-live.',
      estimated_hours = COALESCE(estimated_hours, 70),
      is_active = true
    WHERE id = service_id;
  END IF;

  -- Retire legacy label, if separate row exists.
  UPDATE public.service_templates
  SET is_active = false
  WHERE id <> service_id
    AND lower(name) = 'hubspot service hub setup';

  -- Rebuild SOP/task template.
  DELETE FROM public.sop_tasks
  WHERE sop_id IN (
    SELECT id FROM public.service_sops WHERE service_template_id = service_id
  );

  DELETE FROM public.service_sops
  WHERE service_template_id = service_id;

  -- Pre-onboarding gate
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    'Pre-Onboarding Checklist',
    'Dependencies that must be completed before Account & User Setup starts.',
    0
  ) RETURNING id INTO sop_pre_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop_pre_id, 'Confirm DNS + KB subdomain readiness', 'Validate DNS ownership and timeline for KB/portal domain setup.', 0, 1, true),
    (sop_pre_id, 'Confirm user list + roles + teams', 'Collect complete user roster and role/team mapping.', 1, 1, true),
    (sop_pre_id, 'Confirm tracking code and channel prerequisites', 'Verify website tracking and channel dependencies are in place.', 2, 1, true);

  -- 1) Account & User Setup
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Account & User Setup', 'Set up users, teams, roles, and baseline account settings.', 1)
  RETURNING id INTO sop1_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop1_id, 'Configure users and team permissions', 'Provision users and assign roles/teams aligned to support model.', 0, 3, true),
    (sop1_id, 'Configure baseline service settings', 'Configure service defaults and account-level settings.', 1, 2, true);

  -- 2) Ticket Data Model & Properties
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Ticket Data Model & Properties', 'Define ticket properties, priorities, categories, and ownership fields.', 2)
  RETURNING id INTO sop2_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop2_id, 'Define ticket categories and priority model', 'Implement category/priority definitions and standard values.', 0, 3, true),
    (sop2_id, 'Configure required ticket properties', 'Add/validate required properties and stage-level data quality rules.', 1, 3, true);

  -- 3) Company & Contact Structure
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Company & Contact Structure', 'Align contact/company properties to service process and segmentation.', 3)
  RETURNING id INTO sop3_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop3_id, 'Configure customer tier and entitlement properties', 'Model customer tiers and key support entitlement fields.', 0, 2, true),
    (sop3_id, 'Align contact/company ownership and routing fields', 'Ensure ownership/routing fields support handoffs and SLAs.', 1, 2, true);

  -- 4) Ticket Pipeline Configuration
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Ticket Pipeline Configuration', 'Build ticket pipelines and status flow for service operations.', 4)
  RETURNING id INTO sop4_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop4_id, 'Configure ticket pipeline stages', 'Implement stage model for intake, triage, in progress, resolved, closed.', 0, 3, true),
    (sop4_id, 'Map transitions and ownership rules', 'Define how tickets transition and who owns each stage.', 1, 2, true);

  -- 5) Help Desk & Conversations
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Help Desk & Conversations (Inbox, Chat, Bot, Portal)', 'Configure channel intake and conversation routing.', 5)
  RETURNING id INTO sop5_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop5_id, 'Connect inbox and configured channels', 'Set up shared inbox and selected support channels.', 0, 4, true),
    (sop5_id, 'Configure chatbot/portal scope if enabled', 'Implement chatbot and/or customer portal as requested.', 1, 4, true);

  -- 6) Knowledge Base Setup
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Knowledge Base Setup', 'Set up KB domain, languages, structure, and publishing baseline.', 6)
  RETURNING id INTO sop6_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop6_id, 'Configure KB domain and language settings', 'Set KB domain/subdomain and enabled languages.', 0, 3, true),
    (sop6_id, 'Establish KB taxonomy and initial content plan', 'Define category structure and migration/import approach.', 1, 3, true);

  -- 7) Customer Feedback & Surveys
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Customer Feedback & Surveys', 'Set up CSAT/CES/NPS surveys and trigger rules.', 7)
  RETURNING id INTO sop7_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop7_id, 'Configure selected survey types', 'Enable selected feedback surveys and baseline question sets.', 0, 2, true),
    (sop7_id, 'Configure survey trigger timing and ownership', 'Define triggers and assignment for follow-up actions.', 1, 2, true);

  -- 8) Service Level Agreements
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Service Level Agreements (SLAs)', 'Define SLA policy by priority/tier and working hours.', 8)
  RETURNING id INTO sop8_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop8_id, 'Implement SLA targets and calendars', 'Configure SLA timers using working hours and holiday exclusions.', 0, 3, true),
    (sop8_id, 'Validate breach behavior and escalations', 'Test breach logic and operational escalation outcomes.', 1, 2, true);

  -- 9) Automation (Workflows)
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Automation (Workflows)', 'Implement service workflows for routing, notifications, and follow-ups.', 9)
  RETURNING id INTO sop9_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop9_id, 'Build routing and escalation workflows', 'Automate assignment, escalation, and internal notifications.', 0, 4, true),
    (sop9_id, 'Build lifecycle/follow-up workflows', 'Automate post-resolution and customer follow-up actions.', 1, 3, true);

  -- 10) Reporting & Dashboards
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Reporting & Dashboards', 'Deliver KPI dashboards and operational reporting baseline.', 10)
  RETURNING id INTO sop10_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop10_id, 'Build priority KPI dashboards', 'Implement top KPI/report views requested in brief.', 0, 3, true),
    (sop10_id, 'Validate handoff reporting package', 'Finalize reporting views and handoff documentation.', 1, 2, true);

  -- Rebuild intake form config for canonical service.
  DELETE FROM public.intake_form_conditions WHERE service_template_id = service_id;
  DELETE FROM public.intake_form_fields WHERE service_template_id = service_id;

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, options, help_text)
  VALUES
    (service_id, 'service_hub_tier', 'select', 'Which Service Hub tier are you on?', true, 1, '["Service Hub Professional","Service Hub Enterprise","Not decided yet"]'::jsonb, 'This SOP applies to Pro and Enterprise. Customer Portal and SLA features require Pro+.'),
    (service_id, 'service_motion', 'multiselect', 'What is the primary service motion you''re setting up?', true, 2, '["Break/fix support","Customer onboarding","Account management / renewals","Technical support","Billing support","Professional services delivery"]'::jsonb, 'We may recommend separate pipelines for distinct motions.'),
    (service_id, 'team_size', 'number', 'How many service / support agents will use the system?', true, 3, null, null),
    (service_id, 'team_structure', 'multiselect', 'How is the support team organized?', true, 4, '["Single team (no sub-teams)","Tiered (Tier 1 / Tier 2 / Tier 3)","By function (Technical / Billing / CS)","By region / language","By product line","Other"]'::jsonb, null),
    (service_id, 'team_structure_detail', 'textarea', 'Describe the team structure in more detail (names of teams, rough headcount per team)', false, 5, null, null),
    (service_id, 'support_channels', 'multiselect', 'Which support channels should flow into HubSpot?', true, 6, '["Shared email inbox","Live chat on website","Chatbot","Customer Portal","Web forms","Phone (logged manually)","Phone (via integration)","Social / messaging apps","Slack Connect channels"]'::jsonb, null),
    (service_id, 'shared_inbox_address', 'email', 'Primary shared inbox address', true, 7, null, 'Existing address to migrate, or the new one to create.'),
    (service_id, 'additional_inboxes', 'textarea', 'Any additional shared inboxes to connect?', false, 8, null, null),
    (service_id, 'existing_ticket_data', 'radio', 'Do you have existing ticket data to migrate?', true, 9, '["Yes — from a dedicated help desk (Zendesk, Freshdesk, Intercom, etc.)","Yes — from an email inbox only","Yes — from another HubSpot portal","No — starting fresh"]'::jsonb, null),
    (service_id, 'existing_ticket_system', 'textarea', 'If yes, which system and approximate ticket volume?', false, 10, null, null),
    (service_id, 'existing_kb', 'radio', 'Do you have existing knowledge base content?', true, 11, '["Yes — in a dedicated KB tool (Zendesk, Notion, Helpjuice, etc.)","Yes — in docs / wiki (Confluence, Google Docs, etc.)","Partial / drafts only","No — starting fresh"]'::jsonb, null),
    (service_id, 'kb_subdomain', 'url', 'Desired knowledge base subdomain', true, 12, null, 'DNS must be updated before go-live. Superwork will provide the CNAME.'),
    (service_id, 'kb_languages', 'multiselect', 'Which languages should the knowledge base support?', true, 13, '["Norwegian (bokmal)","Norwegian (nynorsk)","Swedish","Danish","English","German","French","Spanish","Finnish","Other"]'::jsonb, null),
    (service_id, 'ticket_categories', 'multiselect', 'Which ticket categories should we configure?', true, 14, '["Billing","Technical","General Inquiry","Onboarding","Bug Report","Feature Request","Account Management","Other"]'::jsonb, 'These become dropdown values on the Category property.'),
    (service_id, 'ticket_categories_other', 'textarea', 'Any additional ticket categories specific to your business?', false, 15, null, null),
    (service_id, 'customer_tiers', 'radio', 'Do you differentiate service levels by customer tier?', true, 16, '["Yes — Premium / Standard / Basic (or similar)","Yes — custom tier structure","No — same service level for all customers"]'::jsonb, null),
    (service_id, 'customer_tier_detail', 'textarea', 'If yes, describe the tiers and entitlements', false, 17, null, null),
    (service_id, 'existing_slas', 'radio', 'Do you have existing SLAs documented?', true, 18, '["Yes — written and enforced today","Yes — written but not systematically enforced","No — we want to define them during this project"]'::jsonb, null),
    (service_id, 'sla_targets', 'textarea', 'Target SLAs (time to first response + time to close, per priority)', true, 19, null, 'Set targets you can actually meet. Tighten later.'),
    (service_id, 'working_hours', 'text', 'Support working hours (for SLA calculation)', true, 20, null, null),
    (service_id, 'holiday_calendar', 'textarea', 'Any holiday or maintenance windows to exclude from SLAs?', false, 21, null, null),
    (service_id, 'csat_ces_nps', 'multiselect', 'Which feedback surveys should we enable?', true, 22, '["CSAT (after ticket resolution)","CES (after key interactions)","NPS (quarterly)","None for now"]'::jsonb, null),
    (service_id, 'customer_portal_needed', 'radio', 'Do you want a Customer Portal for self-service?', true, 23, '["Yes — configure at go-live","Yes — but not until post-launch","No"]'::jsonb, 'Customer Portal requires Service Hub Pro or Enterprise.'),
    (service_id, 'chatbot_needed', 'radio', 'Do you want a chatbot on the website?', true, 24, '["Yes — full chatbot + live-chat fallback","Yes — live chat only (no bot)","No"]'::jsonb, null),
    (service_id, 'chatbot_scope', 'textarea', 'If yes, what should the chatbot handle?', false, 25, null, null),
    (service_id, 'tracking_code_installed', 'radio', 'Is the HubSpot tracking code installed on the website?', true, 26, '["Yes — already installed","No — we will install before kickoff","No — need help from Superwork"]'::jsonb, null),
    (service_id, 'integrations_needed', 'multiselect', 'Which integrations should Service Hub connect to?', true, 27, '["Slack (internal notifications)","Microsoft Teams","Jira (engineering escalations)","Linear (engineering escalations)","Product analytics (Mixpanel, Amplitude, Heap)","Phone / dialer (Aircall, Dialpad)","Billing (Stripe, Chargebee, Tripletex, Fortnox, etc.)","Data warehouse / BI","None"]'::jsonb, null),
    (service_id, 'escalation_rules', 'textarea', 'How should escalations work?', true, 28, null, null),
    (service_id, 'reporting_priorities', 'textarea', 'What are your top 3–5 reports / KPIs for service?', true, 29, null, null),
    (service_id, 'user_list_ready', 'radio', 'Is a complete list of HubSpot users (name, email, role, team) ready?', true, 30, '["Yes — will send with this brief","No — will provide before kickoff"]'::jsonb, null),
    (service_id, 'brand_assets_ready', 'radio', 'Are brand assets ready for KB + Customer Portal (logo, colors, fonts)?', true, 31, '["Yes — already in HubSpot File Manager","Yes — will send with this brief","No — will follow up"]'::jsonb, null),
    (service_id, 'project_owner', 'textarea', 'Client-side project owner (name + role + email)', true, 32, null, null),
    (service_id, 'service_lead', 'textarea', 'Service / support lead who will own the setup post-go-live (name + role + email)', true, 33, null, null),
    (service_id, 'target_golive_date', 'text', 'Target go-live date', true, 34, null, null),
    (service_id, 'blackout_dates', 'textarea', 'Dates to avoid (product launches, end of quarter, peak support season, etc.)', false, 35, null, null),
    (service_id, 'additional_notes', 'textarea', 'Anything else we should know?', false, 36, null, null);

  -- Optional metadata/defaults/placeholders.
  UPDATE public.intake_form_fields
    SET validation = '{"min":1}'::jsonb
  WHERE service_template_id = service_id
    AND field_name = 'team_size';

  UPDATE public.intake_form_fields
    SET placeholder = 'support@yourcompany.com'
  WHERE service_template_id = service_id
    AND field_name = 'shared_inbox_address';

  UPDATE public.intake_form_fields
    SET placeholder = 'e.g. billing@, onboarding@, no-replies we should ignore'
  WHERE service_template_id = service_id
    AND field_name = 'additional_inboxes';

  UPDATE public.intake_form_fields
    SET placeholder = 'e.g. "Zendesk, ~5,000 open + ~40,000 historical tickets"'
  WHERE service_template_id = service_id
    AND field_name = 'existing_ticket_system';

  UPDATE public.intake_form_fields
    SET placeholder = 'https://help.yourcompany.com'
  WHERE service_template_id = service_id
    AND field_name = 'kb_subdomain';

  UPDATE public.intake_form_fields
    SET default_value = 'Yes — Premium / Standard / Basic (or similar)'
  WHERE service_template_id = service_id
    AND field_name = 'customer_tiers';

  UPDATE public.intake_form_fields
    SET placeholder = 'e.g. "Premium = 1h first response, 4h resolution; Standard = 4h / 1 day; Basic = 8h / 3 days"'
  WHERE service_template_id = service_id
    AND field_name = 'customer_tier_detail';

  UPDATE public.intake_form_fields
    SET placeholder = 'Critical: 1h first response, 4h close\nHigh: 4h / 1 day\nMedium: 8h / 3 days\nLow: 24h / 5 days'
  WHERE service_template_id = service_id
    AND field_name = 'sla_targets';

  UPDATE public.intake_form_fields
    SET placeholder = 'e.g. Mon-Fri 08:00-17:00 CET'
  WHERE service_template_id = service_id
    AND field_name = 'working_hours';

  UPDATE public.intake_form_fields
    SET placeholder = 'e.g. Norwegian public holidays, Christmas week closure'
  WHERE service_template_id = service_id
    AND field_name = 'holiday_calendar';

  UPDATE public.intake_form_fields
    SET placeholder = 'e.g. FAQ deflection, ticket creation, account status lookup'
  WHERE service_template_id = service_id
    AND field_name = 'chatbot_scope';

  UPDATE public.intake_form_fields
    SET placeholder = 'e.g. "SLA breach -> notify owner + manager in Slack. Critical priority -> PagerDuty. Negative CSAT -> CSM follow-up task."'
  WHERE service_template_id = service_id
    AND field_name = 'escalation_rules';

  UPDATE public.intake_form_fields
    SET placeholder = 'e.g. SLA compliance rate, CSAT trend, ticket volume by category, reopen rate, first contact resolution'
  WHERE service_template_id = service_id
    AND field_name = 'reporting_priorities';

  UPDATE public.intake_form_fields
    SET placeholder = 'YYYY-MM-DD'
  WHERE service_template_id = service_id
    AND field_name = 'target_golive_date';

  -- Conditional logic rules.
  INSERT INTO public.intake_form_conditions (
    service_template_id,
    trigger_field_name,
    trigger_value,
    action,
    target_field_names
  )
  VALUES
    (service_id, 'existing_ticket_data', 'Yes — from a dedicated help desk (Zendesk, Freshdesk, Intercom, etc.)', 'show', ARRAY['existing_ticket_system']),
    (service_id, 'existing_ticket_data', 'Yes — from another HubSpot portal', 'show', ARRAY['existing_ticket_system']),
    (service_id, 'customer_tiers', 'Yes — Premium / Standard / Basic (or similar)', 'show', ARRAY['customer_tier_detail']),
    (service_id, 'customer_tiers', 'Yes — custom tier structure', 'show', ARRAY['customer_tier_detail']),
    (service_id, 'chatbot_needed', 'Yes — full chatbot + live-chat fallback', 'show', ARRAY['chatbot_scope']),
    (service_id, 'ticket_categories', 'Other', 'show', ARRAY['ticket_categories_other']);
END $$;

-- Verification
-- Expected:
-- - service row: 1 (name = HubSpot Service Onboarding, category = HubSpot Services, is_active = true)
-- - sop_count: 11 (1 pre-onboarding + 10 sections)
-- - total_task_count: 23
-- - total_field_count: 36
-- - condition_count: 6
SELECT
  st.id,
  st.name,
  st.category,
  st.is_active,
  COUNT(DISTINCT ss.id) AS sop_count,
  COUNT(DISTINCT t.id) AS total_task_count
FROM public.service_templates st
LEFT JOIN public.service_sops ss ON ss.service_template_id = st.id
LEFT JOIN public.sop_tasks t ON t.sop_id = ss.id
WHERE st.name = 'HubSpot Service Onboarding'
GROUP BY st.id, st.name, st.category, st.is_active;

SELECT
  COUNT(*) AS total_field_count
FROM public.intake_form_fields f
JOIN public.service_templates st ON st.id = f.service_template_id
WHERE st.name = 'HubSpot Service Onboarding';

SELECT
  COUNT(*) AS condition_count
FROM public.intake_form_conditions c
JOIN public.service_templates st ON st.id = c.service_template_id
WHERE st.name = 'HubSpot Service Onboarding';
