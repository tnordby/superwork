-- =============================================
-- RLS POLICIES FOR SERVICE TEMPLATES
-- =============================================
-- This script adds Row Level Security policies for service templates
-- =============================================

-- Enable RLS on service tables if not already enabled
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service templates are viewable by all authenticated users" ON public.service_templates;
DROP POLICY IF EXISTS "Service templates are manageable by admins only" ON public.service_templates;
DROP POLICY IF EXISTS "Service SOPs are viewable by all authenticated users" ON public.service_sops;
DROP POLICY IF EXISTS "Service SOPs are manageable by admins only" ON public.service_sops;
DROP POLICY IF EXISTS "SOP tasks are viewable by all authenticated users" ON public.sop_tasks;
DROP POLICY IF EXISTS "SOP tasks are manageable by admins only" ON public.sop_tasks;

-- =============================================
-- SERVICE_TEMPLATES POLICIES
-- =============================================

-- Allow all authenticated users to view active service templates
CREATE POLICY "Service templates are viewable by all authenticated users"
ON public.service_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow admins to manage service templates
CREATE POLICY "Service templates are manageable by admins only"
ON public.service_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- =============================================
-- SERVICE_SOPS POLICIES
-- =============================================

-- Allow all authenticated users to view SOPs for active service templates
CREATE POLICY "Service SOPs are viewable by all authenticated users"
ON public.service_sops
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_templates
    WHERE service_templates.id = service_sops.service_template_id
    AND service_templates.is_active = true
  )
);

-- Allow admins to manage SOPs
CREATE POLICY "Service SOPs are manageable by admins only"
ON public.service_sops
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- =============================================
-- SOP_TASKS POLICIES
-- =============================================

-- Allow all authenticated users to view SOP tasks
CREATE POLICY "SOP tasks are viewable by all authenticated users"
ON public.sop_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_sops
    INNER JOIN public.service_templates ON service_templates.id = service_sops.service_template_id
    WHERE service_sops.id = sop_tasks.sop_id
    AND service_templates.is_active = true
  )
);

-- Allow admins to manage SOP tasks
CREATE POLICY "SOP tasks are manageable by admins only"
ON public.sop_tasks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- =============================================
-- VERIFICATION
-- =============================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('service_templates', 'service_sops', 'sop_tasks')
ORDER BY tablename, policyname;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'RLS policies successfully created for service templates, SOPs, and SOP tasks!' as message;
