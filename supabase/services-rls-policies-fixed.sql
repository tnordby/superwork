-- =============================================
-- FIXED RLS POLICIES FOR SERVICE TEMPLATES
-- =============================================
-- This fixes the "permission denied for table users" error
-- by removing the dependency on auth.users table
-- =============================================

-- Drop all existing policies first
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
-- No users table dependency!
CREATE POLICY "Service templates are viewable by all authenticated users"
ON public.service_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow admins to manage service templates
-- Using auth.jwt() to avoid users table query
CREATE POLICY "Service templates are manageable by admins only"
ON public.service_templates
FOR ALL
TO authenticated
USING (
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
);

-- =============================================
-- SERVICE_SOPS POLICIES
-- =============================================

-- Allow all authenticated users to view SOPs for active service templates
-- No users table dependency!
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
-- Using auth.jwt() to avoid users table query
CREATE POLICY "Service SOPs are manageable by admins only"
ON public.service_sops
FOR ALL
TO authenticated
USING (
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
);

-- =============================================
-- SOP_TASKS POLICIES
-- =============================================

-- Allow all authenticated users to view SOP tasks
-- No users table dependency!
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
-- Using auth.jwt() to avoid users table query
CREATE POLICY "SOP tasks are manageable by admins only"
ON public.sop_tasks
FOR ALL
TO authenticated
USING (
  (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin'
);

-- =============================================
-- VERIFICATION
-- =============================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual IS NULL THEN 'N/A'
    ELSE left(qual, 100)
  END as policy_check
FROM pg_policies
WHERE tablename IN ('service_templates', 'service_sops', 'sop_tasks')
ORDER BY tablename, policyname;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'FIXED RLS policies successfully created! No more "permission denied for table users" errors!' as message;
