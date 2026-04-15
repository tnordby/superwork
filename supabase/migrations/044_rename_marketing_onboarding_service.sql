-- Rename service template for clearer customer-facing naming.
-- Old: HubSpot Marketing Hub Onboarding
-- New: HubSpot Marketing Onboarding

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.service_templates
    WHERE name = 'HubSpot Marketing Hub Onboarding'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.service_templates
    WHERE name = 'HubSpot Marketing Onboarding'
  ) THEN
    UPDATE public.service_templates
    SET name = 'HubSpot Marketing Onboarding'
    WHERE name = 'HubSpot Marketing Hub Onboarding';
  END IF;
END $$;
