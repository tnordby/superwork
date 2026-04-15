-- =============================================
-- REMOVE DUPLICATE HUBSPOT MARKETING ONBOARDING
-- =============================================
-- This script will keep the most recent one and delete older duplicates.
-- Supports both the new and legacy service names.
-- =============================================

-- First, let's see what we have
SELECT
  id,
  name,
  created_at,
  estimated_hours
FROM service_templates
WHERE name IN ('HubSpot Marketing Onboarding', 'HubSpot Marketing Hub Onboarding')
ORDER BY created_at DESC;

-- Delete the older duplicate (keeps the most recent one)
-- This will also cascade delete the associated SOPs and tasks
DELETE FROM service_templates
WHERE id IN (
  SELECT id
  FROM service_templates
  WHERE name IN ('HubSpot Marketing Onboarding', 'HubSpot Marketing Hub Onboarding')
  ORDER BY created_at ASC
  LIMIT 1
);

-- Verify only one remains
SELECT
  id,
  name,
  created_at,
  estimated_hours
FROM service_templates
WHERE name IN ('HubSpot Marketing Onboarding', 'HubSpot Marketing Hub Onboarding');

-- =============================================
-- SUCCESS!
-- =============================================
-- The older duplicate has been removed.
-- Only the most recent version remains.
