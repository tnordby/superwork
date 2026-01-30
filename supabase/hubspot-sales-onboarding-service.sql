-- =============================================
-- SERVICE: HubSpot Sales Onboarding
-- =============================================
-- Run this in Supabase SQL Editor to create the service

DO $$
DECLARE
  service_id uuid;
  sop1_id uuid;
  sop2_id uuid;
  sop3_id uuid;
BEGIN
  -- Create Service Template
  INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
  VALUES (
    'HubSpot Sales Onboarding',
    'HubSpot Services',
    'We onboard your sales team to HubSpot the right way. This service configures pipelines, properties, lifecycle logic, automation, reporting, and the Sales Workspace so reps know what to do every day—and leadership can trust the numbers.',
    60,
    true
  ) RETURNING id INTO service_id;

  -- SOP 1: Account, Users & CRM Foundations
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    'Account, Users & CRM Foundations',
    'Establishes users, permissions, and a clean CRM data model that sales can trust.',
    0
  ) RETURNING id INTO sop1_id;

  -- Tasks for SOP 1
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop1_id, 'User & Team Setup', 'Create users, assign permissions, and structure teams by role, region, and segment.', 0, 5, true),
    (sop1_id, 'Email & Calendar Connections', 'Connect inboxes and calendars, enable logging and tracking, and verify meeting sync.', 1, 3, true),
    (sop1_id, 'Deal Property Model', 'Define and standardize required deal properties (ICP fit, buyer role, source, close reasons).', 2, 6, true),
    (sop1_id, 'Stage-Based Data Enforcement', 'Enforce required properties per deal stage to prevent unqualified pipeline movement.', 3, 4, true);

  -- SOP 2: Sales Process & Execution Setup
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    'Sales Process & Execution Setup',
    'Configures pipelines, lifecycle logic, tasks, and Sales Workspace for daily execution.',
    1
  ) RETURNING id INTO sop2_id;

  -- Tasks for SOP 2
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop2_id, 'Sales Pipeline Configuration', 'Build deal stages aligned to the real sales process with probabilities and guardrails.', 0, 5, true),
    (sop2_id, 'Lifecycle Stage & Lead Status Definition', 'Align lifecycle stages and lead status usage rules with the sales team.', 1, 3, true),
    (sop2_id, 'Sales Workspace Configuration', 'Configure Sales Workspace views, filters, and task queues for reps.', 2, 4, true),
    (sop2_id, 'Task Defaults & Execution Rules', 'Define task naming conventions, due dates, and queues.', 3, 2, true);

  -- SOP 3: Automation, Sequences & Reporting
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    'Automation, Sequences & Reporting',
    'Automates handoffs, follow-ups, and reporting so the system runs without manual policing.',
    2
  ) RETURNING id INTO sop3_id;

  -- Tasks for SOP 3
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop3_id, 'Email Templates & Sequences', 'Create core email templates and sequences for outbound, inbound, and re-engagement.', 0, 6, true),
    (sop3_id, 'Sales Automation (Workflows)', 'Build workflows for lifecycle updates, deal stage automation, owner assignment, and tasks.', 1, 8, true),
    (sop3_id, 'Sales Dashboards & Reporting', 'Build core dashboards for pipeline, forecast, win/loss, and rep activity.', 2, 8, true);

  -- Output the service ID for reference
  RAISE NOTICE 'Service created with ID: %', service_id;

END $$;

-- Verify creation
SELECT
  st.name,
  st.category,
  st.estimated_hours,
  st.is_active,
  count(DISTINCT ss.id) as sop_count,
  count(st2.id) as task_count,
  sum(st2.estimated_hours) as total_task_hours
FROM service_templates st
LEFT JOIN service_sops ss ON ss.service_template_id = st.id
LEFT JOIN sop_tasks st2 ON st2.sop_id = ss.id
WHERE st.name = 'HubSpot Sales Onboarding'
GROUP BY st.id, st.name, st.category, st.estimated_hours, st.is_active;

-- =============================================
-- SUCCESS!
-- =============================================
-- HubSpot Sales Onboarding service created with:
-- ✓ 3 SOPs (Account/Users/CRM → Sales Process → Automation/Reporting)
-- ✓ 11 tasks across all SOPs
-- ✓ 60 estimated hours total
-- ✓ Active and visible to customers
