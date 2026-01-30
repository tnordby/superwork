-- =============================================
-- COMPLETE SETUP: HubSpot Sales Onboarding with Intake Form
-- =============================================
-- This file runs everything needed in the correct order:
-- 1. Create intake forms tables
-- 2. Create the service template
-- 3. Add intake form fields
-- =============================================

-- =============================================
-- PART 1: CREATE INTAKE FORMS TABLES
-- =============================================

-- Table: intake_form_fields
CREATE TABLE IF NOT EXISTS public.intake_form_fields (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_template_id uuid REFERENCES public.service_templates ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  field_type text NOT NULL,
  label text NOT NULL,
  placeholder text,
  help_text text,
  is_required boolean DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  options jsonb,
  validation jsonb,
  default_value text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.intake_form_fields IS 'Custom intake form field definitions for service templates';

CREATE INDEX IF NOT EXISTS intake_form_fields_service_template_id_idx ON public.intake_form_fields(service_template_id);
CREATE INDEX IF NOT EXISTS intake_form_fields_order_idx ON public.intake_form_fields(order_index);

-- Table: intake_form_conditions
CREATE TABLE IF NOT EXISTS public.intake_form_conditions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_template_id uuid REFERENCES public.service_templates ON DELETE CASCADE NOT NULL,
  trigger_field_name text NOT NULL,
  trigger_value text NOT NULL,
  action text NOT NULL,
  target_field_names text[] NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.intake_form_conditions IS 'Conditional logic rules for intake forms';

CREATE INDEX IF NOT EXISTS intake_form_conditions_service_template_id_idx ON public.intake_form_conditions(service_template_id);

-- Table: project_intake_responses
CREATE TABLE IF NOT EXISTS public.project_intake_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  service_template_id uuid REFERENCES public.service_templates ON DELETE SET NULL,
  responses jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.project_intake_responses IS 'Customer responses to service intake forms';

CREATE INDEX IF NOT EXISTS project_intake_responses_project_id_idx ON public.project_intake_responses(project_id);
CREATE INDEX IF NOT EXISTS project_intake_responses_service_template_id_idx ON public.project_intake_responses(service_template_id);

-- RLS Policies
ALTER TABLE public.intake_form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view intake form fields for active services" ON public.intake_form_fields;
CREATE POLICY "Anyone can view intake form fields for active services"
  ON public.intake_form_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_templates
      WHERE service_templates.id = intake_form_fields.service_template_id
      AND service_templates.is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can modify intake form fields" ON public.intake_form_fields;
CREATE POLICY "Only admins can modify intake form fields"
  ON public.intake_form_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

ALTER TABLE public.intake_form_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view intake form conditions for active services" ON public.intake_form_conditions;
CREATE POLICY "Anyone can view intake form conditions for active services"
  ON public.intake_form_conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_templates
      WHERE service_templates.id = intake_form_conditions.service_template_id
      AND service_templates.is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can modify intake form conditions" ON public.intake_form_conditions;
CREATE POLICY "Only admins can modify intake form conditions"
  ON public.intake_form_conditions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

ALTER TABLE public.project_intake_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own intake responses" ON public.project_intake_responses;
CREATE POLICY "Users can view their own intake responses"
  ON public.project_intake_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_intake_responses.project_id
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own intake responses" ON public.project_intake_responses;
CREATE POLICY "Users can insert their own intake responses"
  ON public.project_intake_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_intake_responses.project_id
      AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own intake responses" ON public.project_intake_responses;
CREATE POLICY "Users can update their own intake responses"
  ON public.project_intake_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_intake_responses.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Triggers
DROP TRIGGER IF EXISTS set_updated_at ON public.intake_form_fields;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.intake_form_fields
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.project_intake_responses;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.project_intake_responses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.intake_form_fields TO authenticated;
GRANT ALL ON public.intake_form_conditions TO authenticated;
GRANT ALL ON public.project_intake_responses TO authenticated;

-- =============================================
-- PART 2: CREATE SERVICE TEMPLATE
-- =============================================

DO $$
DECLARE
  service_id uuid;
  sop1_id uuid;
  sop2_id uuid;
  sop3_id uuid;
BEGIN
  -- Delete existing service if it exists (for clean re-run)
  DELETE FROM public.service_templates WHERE name = 'HubSpot Sales Onboarding';

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

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop3_id, 'Email Templates & Sequences', 'Create core email templates and sequences for outbound, inbound, and re-engagement.', 0, 6, true),
    (sop3_id, 'Sales Automation (Workflows)', 'Build workflows for lifecycle updates, deal stage automation, owner assignment, and tasks.', 1, 8, true),
    (sop3_id, 'Sales Dashboards & Reporting', 'Build core dashboards for pipeline, forecast, win/loss, and rep activity.', 2, 8, true);

  RAISE NOTICE 'Service created with ID: %', service_id;

  -- =============================================
  -- PART 3: ADD INTAKE FORM FIELDS
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

  -- Conditional Logic: Show reporting requirements if no defined sales process
  INSERT INTO public.intake_form_conditions (
    service_template_id, trigger_field_name, trigger_value, action, target_field_names
  ) VALUES (
    service_id,
    'defined_sales_process',
    'No',
    'show',
    ARRAY['reporting_requirements']
  );

  RAISE NOTICE 'Intake form created with 8 fields and 1 condition';

END $$;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify everything was created
SELECT
  st.name as service_name,
  st.category,
  st.estimated_hours,
  st.is_active,
  count(DISTINCT ss.id) as sop_count,
  count(DISTINCT st2.id) as task_count,
  count(DISTINCT iff.id) as field_count,
  count(DISTINCT ifc.id) as condition_count
FROM service_templates st
LEFT JOIN service_sops ss ON ss.service_template_id = st.id
LEFT JOIN sop_tasks st2 ON st2.sop_id = ss.id
LEFT JOIN intake_form_fields iff ON iff.service_template_id = st.id
LEFT JOIN intake_form_conditions ifc ON ifc.service_template_id = st.id
WHERE st.name = 'HubSpot Sales Onboarding'
GROUP BY st.id, st.name, st.category, st.estimated_hours, st.is_active;

-- =============================================
-- SUCCESS!
-- =============================================
-- Expected results:
-- ✓ service_name: HubSpot Sales Onboarding
-- ✓ sop_count: 3
-- ✓ task_count: 11
-- ✓ field_count: 8
-- ✓ condition_count: 1
