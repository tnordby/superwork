-- Add new HubSpot onboarding service variants and retire legacy generic onboarding service.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.service_templates
    WHERE name = 'HubSpot Service Onboarding'
  ) THEN
    INSERT INTO public.service_templates (
      name,
      category,
      customer_description,
      estimated_hours,
      is_active
    )
    VALUES (
      'HubSpot Service Onboarding',
      'HubSpot Services',
      'Structured onboarding for HubSpot Service Hub including ticket pipelines, SLA setup, inbox configuration, routing, and service reporting.',
      60,
      true
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.service_templates
    WHERE name = 'HubSpot Commerce Onboarding'
  ) THEN
    INSERT INTO public.service_templates (
      name,
      category,
      customer_description,
      estimated_hours,
      is_active
    )
    VALUES (
      'HubSpot Commerce Onboarding',
      'HubSpot Services',
      'End-to-end onboarding for HubSpot Commerce Hub including products, payments, subscriptions, quotes, and revenue tracking foundations.',
      60,
      true
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.service_templates
    WHERE name = 'HubSpot Content Onboarding'
  ) THEN
    INSERT INTO public.service_templates (
      name,
      category,
      customer_description,
      estimated_hours,
      is_active
    )
    VALUES (
      'HubSpot Content Onboarding',
      'HubSpot Services',
      'Onboarding for HubSpot Content Hub covering content structure, publishing workflows, governance, and performance reporting setup.',
      60,
      true
    );
  END IF;

  -- Retire legacy generic onboarding entry if present.
  UPDATE public.service_templates
  SET is_active = false
  WHERE name = 'HubSpot onboarding';
END $$;
