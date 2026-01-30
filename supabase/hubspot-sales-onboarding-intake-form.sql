-- =============================================
-- INTAKE FORM: HubSpot Sales Onboarding
-- =============================================
-- Run this AFTER hubspot-sales-onboarding-service.sql
-- =============================================

DO $$
DECLARE
  service_id uuid;
BEGIN
  -- Get the service ID
  SELECT id INTO service_id
  FROM public.service_templates
  WHERE name = 'HubSpot Sales Onboarding'
  LIMIT 1;

  IF service_id IS NULL THEN
    RAISE EXCEPTION 'Service "HubSpot Sales Onboarding" not found. Run hubspot-sales-onboarding-service.sql first.';
  END IF;

  -- =============================================
  -- INSERT INTAKE FORM FIELDS
  -- =============================================

  -- Field 1: Sales Hub Tier
  INSERT INTO public.intake_form_fields (
    service_template_id, field_name, field_type, label, is_required, order_index, options
  ) VALUES (
    service_id,
    'sales_hub_tier',
    'select',
    'Which Sales Hub tier are you on?',
    true,
    0,
    '["Sales Hub Professional", "Sales Hub Enterprise"]'::jsonb
  );

  -- Field 2: Number of Sales Reps
  INSERT INTO public.intake_form_fields (
    service_template_id, field_name, field_type, label, placeholder, is_required, order_index, validation
  ) VALUES (
    service_id,
    'num_sales_reps',
    'number',
    'How many sales users will actively use HubSpot?',
    'e.g. 5',
    true,
    1,
    '{"min": 1}'::jsonb
  );

  -- Field 3: Sales Roles
  INSERT INTO public.intake_form_fields (
    service_template_id, field_name, field_type, label, is_required, order_index, options
  ) VALUES (
    service_id,
    'sales_roles',
    'multiselect',
    'Which sales roles do you have?',
    true,
    2,
    '["SDR", "Account Executive", "Account Manager", "Sales Manager", "Founder / CEO"]'::jsonb
  );

  -- Field 4: Sales Motion
  INSERT INTO public.intake_form_fields (
    service_template_id, field_name, field_type, label, is_required, order_index, options
  ) VALUES (
    service_id,
    'sales_motion',
    'multiselect',
    'Which sales motions do you run?',
    true,
    3,
    '["Outbound", "Inbound", "Account-based", "Partner-led"]'::jsonb
  );

  -- Field 5: Current CRM State
  INSERT INTO public.intake_form_fields (
    service_template_id, field_name, field_type, label, is_required, order_index, options
  ) VALUES (
    service_id,
    'current_crm_state',
    'select',
    'What best describes your current HubSpot setup?',
    true,
    4,
    '["Brand new portal", "Existing portal needing cleanup", "Major sales process change"]'::jsonb
  );

  -- Field 6: Defined Sales Process
  INSERT INTO public.intake_form_fields (
    service_template_id, field_name, field_type, label, is_required, order_index, options
  ) VALUES (
    service_id,
    'defined_sales_process',
    'radio',
    'Do you already have a documented sales process?',
    true,
    5,
    '["Yes", "No", "Partially"]'::jsonb
  );

  -- Field 7: Reporting Requirements
  INSERT INTO public.intake_form_fields (
    service_template_id, field_name, field_type, label, placeholder, is_required, order_index
  ) VALUES (
    service_id,
    'reporting_requirements',
    'textarea',
    'What sales metrics do leadership care about most?',
    'Pipeline, forecast accuracy, win rate, activity per rep, etc.',
    false,
    6
  );

  -- Field 8: Tool Integrations
  INSERT INTO public.intake_form_fields (
    service_template_id, field_name, field_type, label, is_required, order_index, options
  ) VALUES (
    service_id,
    'tool_integrations',
    'multiselect',
    'Which tools should HubSpot integrate with?',
    false,
    7,
    '["Gmail", "Outlook", "Slack", "Aircall", "Younium", "Other"]'::jsonb
  );

  -- =============================================
  -- INSERT CONDITIONAL LOGIC
  -- =============================================

  -- Rule 1: Show reporting requirements if no defined sales process
  INSERT INTO public.intake_form_conditions (
    service_template_id, trigger_field_name, trigger_value, action, target_field_names
  ) VALUES (
    service_id,
    'defined_sales_process',
    'No',
    'show',
    ARRAY['reporting_requirements']
  );

  RAISE NOTICE 'Intake form created for HubSpot Sales Onboarding (service_id: %)', service_id;

END $$;

-- Verify creation
SELECT
  st.name,
  count(DISTINCT iff.id) as field_count,
  count(DISTINCT ifc.id) as condition_count
FROM service_templates st
LEFT JOIN intake_form_fields iff ON iff.service_template_id = st.id
LEFT JOIN intake_form_conditions ifc ON ifc.service_template_id = st.id
WHERE st.name = 'HubSpot Sales Onboarding'
GROUP BY st.id, st.name;

-- View all fields
SELECT
  field_name,
  field_type,
  label,
  is_required,
  order_index
FROM intake_form_fields iff
JOIN service_templates st ON st.id = iff.service_template_id
WHERE st.name = 'HubSpot Sales Onboarding'
ORDER BY order_index;

-- =============================================
-- SUCCESS!
-- =============================================
-- Intake form created with:
-- ✓ 8 fields (select, multiselect, number, radio, textarea)
-- ✓ 1 conditional logic rule
-- ✓ Ready to display to customers
