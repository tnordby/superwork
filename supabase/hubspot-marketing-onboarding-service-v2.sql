-- =============================================
-- HUBSPOT MARKETING HUB ONBOARDING SERVICE (V2)
-- =============================================
-- Updated version with more granular milestones
-- Run this AFTER removing the old version
-- =============================================

DO $$
DECLARE
  service_id uuid;
  milestone1_id uuid;
  milestone2_id uuid;
  milestone3_id uuid;
  milestone4_id uuid;
  milestone5_id uuid;
  milestone6_id uuid;
  milestone7_id uuid;
BEGIN
  -- =============================================
  -- 1. CREATE SERVICE TEMPLATE
  -- =============================================
  INSERT INTO public.service_templates (
    name,
    category,
    customer_description,
    estimated_hours,
    is_active
  )
  VALUES (
    'HubSpot Marketing Hub Onboarding',
    'HubSpot Services',
    E'This project covers the setup and configuration of **HubSpot Marketing Hub** to establish a solid marketing foundation.\n\nWe will configure core marketing infrastructure including data privacy and consent settings, domains and redirects, forms and calls-to-action, email templates and subscription preferences, landing page templates, marketing workflows, automation, and reporting.\n\nAll work is delivered using a standardized implementation process. You can follow progress in real time through tasks and milestones in this portal.\n\nProgress is tracked automatically based on completed tasks, and you will be notified as the project moves through each phase.',
    80,
    true
  ) RETURNING id INTO service_id;

  -- =============================================
  -- 2. MILESTONE 1: Foundation & Access
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Foundation & Access',
    'Confirm marketing goals, access, DNS contact, and brand assets availability',
    0
  ) RETURNING id INTO milestone1_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone1_id, 'Confirm marketing goals and primary conversion paths', 'Discovery call to understand marketing objectives and key conversion points', 0, 2),
    (milestone1_id, 'Confirm HubSpot access and user permissions', 'Verify team has appropriate access levels in HubSpot Marketing Hub', 1, 1),
    (milestone1_id, 'Confirm DNS / IT contact for domain setup', 'Get contact information for DNS configuration and validation', 2, 0.5),
    (milestone1_id, 'Confirm brand assets are available', 'Ensure logos, fonts, brand guidelines, and images are ready', 3, 0.5);

  -- =============================================
  -- 3. MILESTONE 2: Brand Assets & File Manager
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Brand Assets & File Manager',
    'Set up organized file structure and upload brand assets',
    1
  ) RETURNING id INTO milestone2_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone2_id, 'File manager structure created', 'Create organized folder structure: brand (logo, svg, png, jpg, fonts, favicon), campaigns, video, images, scripts', 0, 1),
    (milestone2_id, 'Brand assets uploaded', 'Upload all brand assets to correct folders in file manager', 1, 2),
    (milestone2_id, 'Custom fonts added via Design Manager', 'Upload font files, add @font-face rules in Design Manager, apply via CSS, validate usage', 2, 3);

  -- =============================================
  -- 4. MILESTONE 3: Privacy, Domains & Email Setup
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Privacy, Domains & Email Setup',
    'Configure data privacy, connect domains, and set up email preferences',
    2
  ) RETURNING id INTO milestone3_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone3_id, 'Privacy & consent banner configured', 'Configure consent banner with cookie preferences, geo-based rules, accessibility compliance, and privacy policy link. Test on desktop and mobile.', 0, 4),
    (milestone3_id, 'Email subscription types created', 'Create and configure subscription types with names, descriptions, privacy messaging, and translations if needed', 1, 2),
    (milestone3_id, 'Domains and redirects connected', 'Connect domains/subdomains, configure primary/secondary settings, redirect rules, SSL, validate DNS records', 2, 4);

  -- =============================================
  -- 5. MILESTONE 4: Forms & CTAs
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Forms & CTAs',
    'Create core website forms, CTAs, and confirmation messages',
    3
  ) RETURNING id INTO milestone4_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone4_id, 'Core website forms created', 'Create newsletter signup, contact form, and request demo forms with required fields and GDPR options', 0, 4),
    (milestone4_id, 'Thank-you pages or confirmation messages configured', 'Set up form confirmation messages, redirects, and notifications', 1, 2),
    (milestone4_id, 'CTAs created and published', 'Create core call-to-action buttons/images with destination links and display rules', 2, 3);

  -- =============================================
  -- 6. MILESTONE 5: Email & Landing Page Templates
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Email & Landing Page Templates',
    'Build and test email templates and landing page templates',
    4
  ) RETURNING id INTO milestone5_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone5_id, 'Email templates created and tested', 'Build base email template with branding, fonts, layout, and tracking. Test on desktop and mobile.', 0, 6),
    (milestone5_id, 'Landing page templates configured', 'Set up landing page templates with SEO defaults, language settings, featured images. Test responsiveness.', 1, 6);

  -- =============================================
  -- 7. MILESTONE 6: Integrations & Workflows
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Integrations & Workflows',
    'Connect advertising and social channels, implement marketing workflows',
    5
  ) RETURNING id INTO milestone6_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone6_id, 'Advertising channels connected', 'Connect ad accounts (Google, LinkedIn, Meta), authorize access, configure attribution and tracking', 0, 3),
    (milestone6_id, 'Social media accounts connected', 'Connect social channels, configure posting permissions, validate analytics connection', 1, 2),
    (milestone6_id, 'Marketing workflows implemented', 'Create workflow folder structure (data governance, deal automation, marketing, operations, archive). Implement governance and lifecycle workflows.', 2, 8);

  -- =============================================
  -- 8. MILESTONE 7: Reporting & Handoff
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Reporting & Handoff',
    'Create dashboards, complete QA, and deliver final walkthrough',
    6
  ) RETURNING id INTO milestone7_id;

  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone7_id, 'Marketing dashboards created', 'Build marketing dashboards with core KPIs, configure filters and date ranges, share with stakeholders', 0, 4),
    (milestone7_id, 'Internal QA completed', 'Review all configurations, test forms, workflows, and templates end-to-end', 1, 4),
    (milestone7_id, 'Customer walkthrough prepared', 'Prepare demo and walkthrough of all configured Marketing Hub features', 2, 3),
    (milestone7_id, 'Documentation and summary shared', 'Create and share setup documentation, credentials, and configuration summary', 3, 3),
    (milestone7_id, 'Customer approval confirmed', 'Conduct final walkthrough and obtain customer sign-off on deliverables', 4, 2);

END $$;

-- =============================================
-- VERIFICATION QUERY
-- =============================================
SELECT
  st.name as "Service",
  ss.title as "Milestone",
  ss.order_index as "Order",
  count(sopt.id) as "Tasks"
FROM service_templates st
JOIN service_sops ss ON ss.service_template_id = st.id
LEFT JOIN sop_tasks sopt ON sopt.sop_id = ss.id
WHERE st.name = 'HubSpot Marketing Hub Onboarding'
GROUP BY st.id, st.name, ss.id, ss.title, ss.order_index
ORDER BY ss.order_index;

-- =============================================
-- SUCCESS!
-- =============================================
-- HubSpot Marketing Hub Onboarding service created with:
-- ✓ 7 focused milestones (instead of 3)
-- ✓ 30 customer-visible tasks
-- ✓ Estimated 80 hours total
--
-- Milestones breakdown:
-- 1. Foundation & Access (4 tasks)
-- 2. Brand Assets & File Manager (3 tasks)
-- 3. Privacy, Domains & Email Setup (3 tasks)
-- 4. Forms & CTAs (3 tasks)
-- 5. Email & Landing Page Templates (2 tasks)
-- 6. Integrations & Workflows (3 tasks)
-- 7. Reporting & Handoff (5 tasks)
