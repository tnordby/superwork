-- Fix DELETE policy for projects table
-- This ensures users can delete their own projects

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Create DELETE policy
CREATE POLICY "Users can delete own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'projects'
  AND cmd = 'DELETE';
