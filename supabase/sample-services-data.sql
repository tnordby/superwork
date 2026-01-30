-- =============================================
-- SAMPLE SERVICE TEMPLATES DATA
-- =============================================
-- Run this AFTER services-schema.sql to populate sample data
-- =============================================

-- =============================================
-- 1. HUBSPOT SERVICES
-- =============================================

-- Service: HubSpot CRM Setup
INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
VALUES (
  'HubSpot CRM Setup',
  'HubSpot Services',
  'Complete setup of your HubSpot CRM including custom objects, properties, deal pipelines, and user permissions. Get your team up and running with a fully configured CRM.',
  40,
  true
) RETURNING id;

-- Get the ID (replace with actual UUID after running above)
-- For this example, we'll use a variable approach

DO $$
DECLARE
  crm_setup_id uuid;
  sop1_id uuid;
  sop2_id uuid;
  sop3_id uuid;
BEGIN
  -- Create CRM Setup service
  INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
  VALUES (
    'HubSpot CRM Setup',
    'HubSpot Services',
    'Complete setup of your HubSpot CRM including custom objects, properties, deal pipelines, and user permissions. Get your team up and running with a fully configured CRM.',
    40,
    true
  ) RETURNING id INTO crm_setup_id;

  -- SOP 1: Discovery & Planning
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    crm_setup_id,
    'Discovery & Planning',
    'Understand business requirements, current processes, and define CRM structure',
    0
  ) RETURNING id INTO sop1_id;

  -- Tasks for SOP 1
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop1_id, 'Conduct discovery call with stakeholders', 'Interview key team members to understand current sales process and pain points', 0, 2),
    (sop1_id, 'Document current sales process', 'Map out existing process, touchpoints, and handoffs', 1, 3),
    (sop1_id, 'Define custom objects requirements', 'Identify what custom objects are needed beyond standard contacts/companies/deals', 2, 2),
    (sop1_id, 'Design pipeline stages and properties', 'Create draft of deal stages, contact lifecycle stages, and required properties', 3, 4);

  -- SOP 2: CRM Configuration
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    crm_setup_id,
    'CRM Configuration',
    'Build out the CRM structure including objects, properties, and pipelines',
    1
  ) RETURNING id INTO sop2_id;

  -- Tasks for SOP 2
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop2_id, 'Create custom objects', 'Set up any custom objects identified in discovery', 0, 3),
    (sop2_id, 'Configure contact properties', 'Add custom contact properties and organize property groups', 1, 4),
    (sop2_id, 'Configure company properties', 'Add custom company properties and organize property groups', 2, 4),
    (sop2_id, 'Set up deal pipelines', 'Create deal pipelines with appropriate stages for each sales process', 3, 3),
    (sop2_id, 'Configure deal properties', 'Add deal properties needed for reporting and qualification', 4, 3),
    (sop2_id, 'Set up lifecycle stages', 'Configure contact lifecycle stages aligned to buyer journey', 5, 2);

  -- SOP 3: User Setup & Training
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    crm_setup_id,
    'User Setup & Training',
    'Configure users, permissions, and provide training',
    2
  ) RETURNING id INTO sop3_id;

  -- Tasks for SOP 3
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop3_id, 'Create user accounts', 'Set up HubSpot user accounts for team members', 0, 1),
    (sop3_id, 'Configure permissions and teams', 'Set up teams and assign appropriate permission sets', 1, 2),
    (sop3_id, 'Create training documentation', 'Build custom documentation for team-specific workflows', 2, 4),
    (sop3_id, 'Conduct admin training session', 'Train administrators on CRM management and maintenance', 3, 2),
    (sop3_id, 'Conduct end-user training', 'Train sales and marketing teams on daily CRM usage', 4, 3);

END $$;

-- =============================================
-- 2. DATA MIGRATION SERVICE
-- =============================================

DO $$
DECLARE
  migration_id uuid;
  sop1_id uuid;
  sop2_id uuid;
  sop3_id uuid;
BEGIN
  -- Create Migration service
  INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
  VALUES (
    'CRM Data Migration',
    'HubSpot Services',
    'Clean migration of contacts, companies, deals, and custom objects from your existing CRM to HubSpot. Includes data cleansing, mapping, and validation.',
    60,
    true
  ) RETURNING id INTO migration_id;

  -- SOP 1: Data Assessment
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    migration_id,
    'Data Assessment & Mapping',
    'Analyze source data and create migration mapping',
    0
  ) RETURNING id INTO sop1_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop1_id, 'Export data from source CRM', 'Extract all relevant data from existing system', 0, 2),
    (sop1_id, 'Analyze data quality', 'Review data for duplicates, missing fields, and formatting issues', 1, 4),
    (sop1_id, 'Create field mapping spreadsheet', 'Map source fields to HubSpot properties', 2, 3),
    (sop1_id, 'Identify data cleansing needs', 'Document what data needs to be cleaned before migration', 3, 2);

  -- SOP 2: Data Preparation
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    migration_id,
    'Data Cleansing & Preparation',
    'Clean and format data for migration',
    1
  ) RETURNING id INTO sop2_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop2_id, 'Remove duplicate records', 'Deduplicate contacts and companies', 0, 6),
    (sop2_id, 'Standardize formatting', 'Clean up phone numbers, addresses, and other formatted fields', 1, 4),
    (sop2_id, 'Fill missing required fields', 'Ensure all required HubSpot fields have values', 2, 4),
    (sop2_id, 'Create import files', 'Format data into HubSpot import CSV templates', 3, 3);

  -- SOP 3: Migration & Validation
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    migration_id,
    'Data Migration & Validation',
    'Import data and verify accuracy',
    2
  ) RETURNING id INTO sop3_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop3_id, 'Import contacts', 'Upload contact records to HubSpot', 0, 3),
    (sop3_id, 'Import companies', 'Upload company records to HubSpot', 1, 3),
    (sop3_id, 'Import deals', 'Upload deal records to HubSpot', 2, 3),
    (sop3_id, 'Import custom objects', 'Upload any custom object records', 3, 2),
    (sop3_id, 'Validate record counts', 'Verify all records imported successfully', 4, 2),
    (sop3_id, 'Spot-check data accuracy', 'Review sample records for data integrity', 5, 3),
    (sop3_id, 'Create migration report', 'Document what was migrated and any issues encountered', 6, 2);

END $$;

-- =============================================
-- 3. REVENUE OPERATIONS SERVICE
-- =============================================

DO $$
DECLARE
  revops_id uuid;
  sop1_id uuid;
  sop2_id uuid;
BEGIN
  -- Create RevOps service
  INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
  VALUES (
    'Sales Process Design',
    'Revenue Operations',
    'Design and implement a scalable sales process including pipelines, playbooks, and automation to drive consistent revenue growth.',
    50,
    true
  ) RETURNING id INTO revops_id;

  -- SOP 1: Process Design
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    revops_id,
    'Sales Process Design',
    'Define ideal sales process and requirements',
    0
  ) RETURNING id INTO sop1_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop1_id, 'Interview sales team', 'Understand current process and pain points', 0, 3),
    (sop1_id, 'Map ideal buyer journey', 'Define stages from lead to customer', 1, 4),
    (sop1_id, 'Design pipeline stages', 'Create deal stages aligned to sales methodology', 2, 3),
    (sop1_id, 'Define stage exit criteria', 'Document requirements to move between stages', 3, 4);

  -- SOP 2: Implementation
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    revops_id,
    'Process Implementation',
    'Build automation and enablement materials',
    1
  ) RETURNING id INTO sop2_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop2_id, 'Configure pipeline in HubSpot', 'Set up deal pipeline with stages', 0, 2),
    (sop2_id, 'Create deal playbooks', 'Build stage-specific playbooks for reps', 1, 6),
    (sop2_id, 'Set up automation workflows', 'Automate tasks and notifications based on stage', 2, 8),
    (sop2_id, 'Create sales templates', 'Build email and document templates', 3, 4),
    (sop2_id, 'Build reporting dashboard', 'Create pipeline and forecast reports', 4, 4),
    (sop2_id, 'Document sales process', 'Create process documentation and training', 5, 3);

END $$;

-- =============================================
-- VERIFY DATA
-- =============================================

-- Check what was created
SELECT
  st.name,
  st.category,
  st.estimated_hours,
  count(DISTINCT ss.id) as sop_count,
  count(st2.id) as task_count
FROM service_templates st
LEFT JOIN service_sops ss ON ss.service_template_id = st.id
LEFT JOIN sop_tasks st2 ON st2.sop_id = ss.id
GROUP BY st.id, st.name, st.category, st.estimated_hours
ORDER BY st.category, st.name;

-- =============================================
-- SUCCESS!
-- =============================================
-- Sample service templates created with SOPs and tasks
-- You can now:
-- 1. Browse services in the UI
-- 2. Create projects from templates
-- 3. See milestones and tasks auto-populate
