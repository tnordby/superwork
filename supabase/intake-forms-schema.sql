-- =============================================
-- INTAKE FORMS SCHEMA
-- =============================================
-- Stores custom intake form configurations for each service template
-- =============================================

-- =============================================
-- 1. INTAKE FORM FIELDS TABLE
-- =============================================
-- Stores field definitions for service intake forms

CREATE TABLE IF NOT EXISTS public.intake_form_fields (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_template_id uuid REFERENCES public.service_templates ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL, -- Internal field name (e.g., 'sales_hub_tier')
  field_type text NOT NULL, -- 'text', 'textarea', 'select', 'multiselect', 'number', 'date', 'email', 'url', 'checkbox', 'radio'
  label text NOT NULL, -- What the customer sees
  placeholder text, -- Example input
  help_text text, -- Optional guidance
  is_required boolean DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  options jsonb, -- For select/radio/multiselect: ["Option 1", "Option 2"]
  validation jsonb, -- Additional validation rules: {"min": 1, "max": 100}
  default_value text, -- Default field value
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.intake_form_fields IS 'Custom intake form field definitions for service templates';

-- Indexes
CREATE INDEX IF NOT EXISTS intake_form_fields_service_template_id_idx ON public.intake_form_fields(service_template_id);
CREATE INDEX IF NOT EXISTS intake_form_fields_order_idx ON public.intake_form_fields(order_index);

-- =============================================
-- 2. INTAKE FORM CONDITIONAL LOGIC TABLE
-- =============================================
-- Stores show/hide rules for fields based on other field values

CREATE TABLE IF NOT EXISTS public.intake_form_conditions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_template_id uuid REFERENCES public.service_templates ON DELETE CASCADE NOT NULL,
  trigger_field_name text NOT NULL, -- Field that triggers the condition
  trigger_value text NOT NULL, -- Value that triggers the condition
  action text NOT NULL, -- 'show' or 'hide'
  target_field_names text[] NOT NULL, -- Array of field names to show/hide
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.intake_form_conditions IS 'Conditional logic rules for intake forms';

-- Indexes
CREATE INDEX IF NOT EXISTS intake_form_conditions_service_template_id_idx ON public.intake_form_conditions(service_template_id);

-- =============================================
-- 3. PROJECT INTAKE RESPONSES TABLE
-- =============================================
-- Stores customer responses to intake forms

CREATE TABLE IF NOT EXISTS public.project_intake_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  service_template_id uuid REFERENCES public.service_templates ON DELETE SET NULL,
  responses jsonb NOT NULL, -- {"field_name": "value", ...}
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.project_intake_responses IS 'Customer responses to service intake forms';

-- Indexes
CREATE INDEX IF NOT EXISTS project_intake_responses_project_id_idx ON public.project_intake_responses(project_id);
CREATE INDEX IF NOT EXISTS project_intake_responses_service_template_id_idx ON public.project_intake_responses(service_template_id);

-- =============================================
-- 4. RLS POLICIES
-- =============================================

-- Intake Form Fields: Public read for active services
ALTER TABLE public.intake_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view intake form fields for active services"
  ON public.intake_form_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_templates
      WHERE service_templates.id = intake_form_fields.service_template_id
      AND service_templates.is_active = true
    )
  );

CREATE POLICY "Only admins can modify intake form fields"
  ON public.intake_form_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Intake Form Conditions: Public read for active services
ALTER TABLE public.intake_form_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view intake form conditions for active services"
  ON public.intake_form_conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_templates
      WHERE service_templates.id = intake_form_conditions.service_template_id
      AND service_templates.is_active = true
    )
  );

CREATE POLICY "Only admins can modify intake form conditions"
  ON public.intake_form_conditions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Project Intake Responses: Users can view/edit their own
ALTER TABLE public.project_intake_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own intake responses"
  ON public.project_intake_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_intake_responses.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own intake responses"
  ON public.project_intake_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_intake_responses.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own intake responses"
  ON public.project_intake_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_intake_responses.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- =============================================
-- 5. UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.intake_form_fields
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.project_intake_responses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.intake_form_fields TO authenticated;
GRANT ALL ON public.intake_form_conditions TO authenticated;
GRANT ALL ON public.project_intake_responses TO authenticated;

-- =============================================
-- SUCCESS!
-- =============================================
-- Intake forms system is now set up with:
-- ✓ Field definitions (text, select, number, etc.)
-- ✓ Conditional logic (show/hide fields)
-- ✓ Response storage per project
-- ✓ Proper RLS policies
