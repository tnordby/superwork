-- Update HubSpot Marketing Hub Onboarding service template with standardized description

UPDATE service_templates
SET customer_description = 'This project establishes a complete, production-ready HubSpot Marketing Hub foundation. The goal is to configure HubSpot so marketing, sales, and operations can run structured campaigns, capture and qualify leads, stay compliant with privacy regulations, and report on performance from day one.

The setup covers core infrastructure (file manager, domains, tracking, consent), demand generation tools (forms, CTAs, landing pages, email templates, ads, social), lifecycle and data governance workflows, ABM capabilities, and standardized reporting. Everything is organized, documented, and aligned with best practices to ensure scalability, compliance, and ease of use for internal teams.'
WHERE name = 'HubSpot Marketing Hub Onboarding';

-- Verify the update
SELECT id, name, customer_description
FROM service_templates
WHERE name = 'HubSpot Marketing Hub Onboarding';
