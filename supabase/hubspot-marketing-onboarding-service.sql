-- =============================================
-- HUBSPOT MARKETING HUB ONBOARDING SERVICE
-- =============================================
-- Based on PRD: public/systems/hubspot-onboarding/hubspot-marketing-onboarding
-- Run this in Supabase SQL Editor after services-schema.sql
-- =============================================

DO $$
DECLARE
  service_id uuid;
  milestone1_id uuid;
  milestone2_id uuid;
  milestone3_id uuid;
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
  -- 2. CREATE INTERNAL SOPs (Milestone 1: Foundation & Access)
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

  -- Tasks for Milestone 1: Foundation & Access
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone1_id, 'Confirm marketing goals and primary conversion paths', 'Discovery call to understand marketing objectives and key conversion points', 0, 2),
    (milestone1_id, 'Confirm HubSpot access and user permissions', 'Verify team has appropriate access levels in HubSpot Marketing Hub', 1, 1),
    (milestone1_id, 'Confirm DNS / IT contact for domain setup', 'Get contact information for DNS configuration and validation', 2, 0.5),
    (milestone1_id, 'Confirm brand assets are available', 'Ensure logos, fonts, brand guidelines, and images are ready', 3, 0.5);

  -- =============================================
  -- 3. CREATE INTERNAL SOPs (Milestone 2: Marketing Hub Setup)
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Marketing Hub Setup',
    'Complete configuration of all Marketing Hub components including file manager, privacy settings, domains, forms, CTAs, email templates, landing pages, fonts, advertising channels, social media, workflows, and dashboards',
    1
  ) RETURNING id INTO milestone2_id;

  -- Tasks for Milestone 2: Marketing Hub Setup (following internal SOP steps)
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone2_id, 'File manager structure created', 'Create organized folder structure: brand (logo, svg, png, jpg, fonts, favicon), campaigns, video, images, scripts', 0, 1),
    (milestone2_id, 'Brand assets uploaded', 'Upload all brand assets to correct folders in file manager', 1, 2),
    (milestone2_id, 'Privacy & consent banner configured', 'Configure consent banner with cookie preferences, geo-based rules, accessibility compliance, and privacy policy link. Test on desktop and mobile.', 2, 4),
    (milestone2_id, 'Email subscription types created', 'Create and configure subscription types with names, descriptions, privacy messaging, and translations if needed', 3, 2),
    (milestone2_id, 'Domains and redirects connected', 'Connect domains/subdomains, configure primary/secondary settings, redirect rules, SSL, validate DNS records', 4, 4),
    (milestone2_id, 'Core website forms created', 'Create newsletter signup, contact form, and request demo forms with required fields and GDPR options', 5, 4),
    (milestone2_id, 'Thank-you pages or confirmation messages configured', 'Set up form confirmation messages, redirects, and notifications', 6, 2),
    (milestone2_id, 'CTAs created and published', 'Create core call-to-action buttons/images with destination links and display rules', 7, 3),
    (milestone2_id, 'Email templates created and tested', 'Build base email template with branding, fonts, layout, and tracking. Test on desktop and mobile.', 8, 6),
    (milestone2_id, 'Landing page templates configured', 'Set up landing page templates with SEO defaults, language settings, featured images. Test responsiveness.', 9, 6),
    (milestone2_id, 'Custom fonts added via Design Manager', 'Upload font files, add @font-face rules in Design Manager, apply via CSS, validate usage', 10, 3),
    (milestone2_id, 'Advertising channels connected', 'Connect ad accounts (Google, LinkedIn, Meta), authorize access, configure attribution and tracking', 11, 3),
    (milestone2_id, 'Social media accounts connected', 'Connect social channels, configure posting permissions, validate analytics connection', 12, 2),
    (milestone2_id, 'Marketing workflows implemented', 'Create workflow folder structure (data governance, deal automation, marketing, operations, archive). Implement governance and lifecycle workflows.', 13, 8),
    (milestone2_id, 'Marketing dashboards created', 'Build marketing dashboards with core KPIs, configure filters and date ranges, share with stakeholders', 14, 4);

  -- =============================================
  -- 4. CREATE INTERNAL SOPs (Milestone 3: Handoff & Validation)
  -- =============================================
  INSERT INTO public.service_sops (
    service_template_id,
    title,
    description,
    order_index
  )
  VALUES (
    service_id,
    'Handoff & Validation',
    'Complete internal QA, prepare customer walkthrough, share documentation, and obtain customer approval',
    2
  ) RETURNING id INTO milestone3_id;

  -- Tasks for Milestone 3: Handoff & Validation
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (milestone3_id, 'Internal QA completed', 'Review all configurations, test forms, workflows, and templates end-to-end', 0, 4),
    (milestone3_id, 'Customer walkthrough prepared', 'Prepare demo and walkthrough of all configured Marketing Hub features', 1, 3),
    (milestone3_id, 'Documentation and summary shared', 'Create and share setup documentation, credentials, and configuration summary', 2, 3),
    (milestone3_id, 'Customer approval confirmed', 'Conduct final walkthrough and obtain customer sign-off on deliverables', 3, 2);

END $$;

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Check what was created
SELECT
  st.name as "Service",
  st.category as "Category",
  st.estimated_hours as "Est. Hours",
  ss.title as "Milestone (SOP)",
  ss.order_index as "Order",
  count(sopt.id) as "Task Count"
FROM service_templates st
JOIN service_sops ss ON ss.service_template_id = st.id
LEFT JOIN sop_tasks sopt ON sopt.sop_id = ss.id
WHERE st.name = 'HubSpot Marketing Hub Onboarding'
GROUP BY st.id, st.name, st.category, st.estimated_hours, ss.id, ss.title, ss.order_index
ORDER BY ss.order_index;

-- =============================================
-- DETAILED TASK LIST
-- =============================================
-- See all tasks for this service
SELECT
  ss.title as "Milestone",
  sopt.order_index as "#",
  sopt.title as "Task",
  sopt.estimated_hours as "Hours"
FROM service_templates st
JOIN service_sops ss ON ss.service_template_id = st.id
JOIN sop_tasks sopt ON sopt.sop_id = ss.id
WHERE st.name = 'HubSpot Marketing Hub Onboarding'
ORDER BY ss.order_index, sopt.order_index;

-- =============================================
-- SUCCESS!
-- =============================================
-- HubSpot Marketing Hub Onboarding service created with:
-- ✓ Service template with customer-facing description
-- ✓ 3 internal SOPs (milestones)
-- ✓ 23 customer-visible tasks
-- ✓ Estimated 80 hours total
--
-- When a customer selects this service:
-- 1. Project is created with the service description
-- 2. 3 milestones are auto-created from SOPs
-- 3. 23 tasks are auto-created and linked to milestones
-- 4. Progress starts at 0%
-- 5. Customers can see milestones and tasks
-- 6. Customers CANNOT see internal SOP details
-- 7. Consultants complete tasks as they execute the SOP
-- 8. Progress updates automatically
