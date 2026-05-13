-- Create/update HubSpot Commerce Hub Onboarding service template, phased SOP plan, and intake form.
-- Source: Service-Intake-HubSpot-Commerce-Hub-Onboarding.md (2026-04-15)

DO $$
DECLARE
  service_id uuid;
  sop1_id uuid;
  sop2_id uuid;
  sop3_id uuid;
  sop4_id uuid;
  sop5_id uuid;
  sop6_id uuid;
  sop7_id uuid;
  sop8_id uuid;
  sop9_id uuid;
  sop10_id uuid;
BEGIN
  -- Resolve or create canonical service template.
  SELECT id
    INTO service_id
  FROM public.service_templates
  WHERE lower(name) IN ('hubspot commerce hub onboarding', 'hubspot commerce onboarding')
  ORDER BY created_at DESC
  LIMIT 1;

  IF service_id IS NULL THEN
    INSERT INTO public.service_templates (
      name,
      category,
      customer_description,
      estimated_hours,
      is_active
    )
    VALUES (
      'HubSpot Commerce Hub Onboarding',
      'HubSpot Services',
      'Structured Commerce Hub onboarding for quote-to-cash: processor setup, product catalog, CPQ, invoices, tax, accounting sync, and go-live enablement.',
      85,
      true
    )
    RETURNING id INTO service_id;
  ELSE
    UPDATE public.service_templates
    SET
      name = 'HubSpot Commerce Hub Onboarding',
      category = 'HubSpot Services',
      customer_description = 'Structured Commerce Hub onboarding for quote-to-cash: processor setup, product catalog, CPQ, invoices, tax, accounting sync, and go-live enablement.',
      estimated_hours = COALESCE(estimated_hours, 85),
      is_active = true
    WHERE id = service_id;
  END IF;

  -- Retire older label to avoid duplicate browse cards.
  UPDATE public.service_templates
  SET is_active = false
  WHERE id <> service_id
    AND lower(name) = 'hubspot commerce onboarding';

  -- Rebuild SOP/task template.
  DELETE FROM public.sop_tasks
  WHERE sop_id IN (
    SELECT id
    FROM public.service_sops
    WHERE service_template_id = service_id
  );

  DELETE FROM public.service_sops
  WHERE service_template_id = service_id;

  -- 1) Discovery & Commercial Model
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Discovery & Commercial Model', 'Confirm region, legal entity, quote-to-cash process, and target operating model.', 1)
  RETURNING id INTO sop1_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop1_id, 'Map current quote-to-cash process', 'Document current tools, handoffs, bottlenecks, and control points.', 0, 3, true),
    (sop1_id, 'Confirm stakeholder owners and RACI for quote-to-cash', 'Assign owners for sales, finance, and RevOps across the commercial workflow.', 1, 4, true);

  -- 2) Processor & Payments Architecture
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Processor & Payments Architecture', 'Select eligible processor and define payment methods/currencies.', 2)
  RETURNING id INTO sop2_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop2_id, 'Configure processor architecture', 'Apply region eligibility and finalize HubSpot Payments vs Stripe design.', 0, 5, true),
    (sop2_id, 'Document PCI scope and settlement cadence', 'Clarify card data flow, settlement timing, and finance reconciliation expectations.', 1, 4, true);

  -- 3) Product Catalog & Pricing Foundations
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Product Catalog & Pricing Foundations', 'Model SKU catalog, packages, and pricing structures for quoting and invoicing.', 3)
  RETURNING id INTO sop3_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop3_id, 'Implement product catalog model', 'Create SKU structure and source-of-truth process for product updates.', 0, 5, true),
    (sop3_id, 'Define pricing books and discount approval tiers', 'Align list price, bundles, and discount governance with CPQ rules.', 1, 4, true);

  -- 4) CPQ & Quote Experience
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'CPQ & Quote Experience', 'Set up quote templates, optional approvals, and pilot rollout scope.', 4)
  RETURNING id INTO sop4_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop4_id, 'Configure quote templates and approval flows', 'Implement CPQ scope and governance controls by tier.', 0, 6, true),
    (sop4_id, 'Pilot CPQ templates with one deal desk', 'Validate templates, line items, and approvals with a narrow pilot before broad rollout.', 1, 4, true);

  -- 5) Invoicing & Collections
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Invoicing & Collections', 'Configure invoice usage, payment terms, and collection touchpoints.', 5)
  RETURNING id INTO sop5_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop5_id, 'Set invoice and collections standards', 'Define invoice strategy, terms, and settlement pathways.', 0, 4, true),
    (sop5_id, 'Configure invoice templates and numbering aligned to accounting', 'Match invoice layout, legal text, and numbering to ERP or policy requirements.', 1, 4, true);

  -- 6) Tax & Compliance Controls
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Tax & Compliance Controls', 'Design tax calculation ownership and compliance guardrails.', 6)
  RETURNING id INTO sop6_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop6_id, 'Implement tax and compliance controls', 'Finalize tax ownership model, jurisdictions, and residency constraints.', 0, 5, true),
    (sop6_id, 'Run tax workshop for jurisdictions and exemptions', 'Validate nexus, B2B reverse charge, and exemption certificate handling.', 1, 4, true);

  -- 7) Accounting Integration
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Accounting Integration', 'Configure accounting sync direction and middleware strategy.', 7)
  RETURNING id INTO sop7_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop7_id, 'Configure accounting sync architecture', 'Implement one-way/bidirectional model and integration controls.', 0, 6, true),
    (sop7_id, 'Map revenue recognition handoff and reconciliation checks', 'Define sync of invoices, payments, and adjustments for month-end close.', 1, 4, true);

  -- 8) Security, Roles & Refund Governance
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Security, Roles & Refund Governance', 'Set user roles and financial permission boundaries.', 8)
  RETURNING id INTO sop8_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop8_id, 'Set role-based permissions and refund governance', 'Apply least privilege and finance ownership for refund operations.', 0, 3, true),
    (sop8_id, 'Audit refund permissions and separation of duties', 'Confirm who can issue refunds, voids, and credit memos across HubSpot and ERP.', 1, 4, true);

  -- 9) Validation & Pilot
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Validation & Pilot', 'Run end-to-end testing and optional team pilot before broad rollout.', 9)
  RETURNING id INTO sop9_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop9_id, 'Execute validation and pilot', 'Test quote-to-cash path and validate KPI baseline.', 0, 4, true),
    (sop9_id, 'Sign off UAT evidence and pilot KPI baseline', 'Capture test cases, approvals, and before/after metrics for go-live.', 1, 4, true);

  -- 10) Launch & Handover
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (service_id, 'Launch & Handover', 'Go-live, enablement, runbook handover, and post-launch checkpoints.', 10)
  RETURNING id INTO sop10_id;
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours, is_required) VALUES
    (sop10_id, 'Run go-live and handover', 'Complete launch checklist and transfer ownership to operations.', 0, 4, true),
    (sop10_id, 'Deliver 30-day hypercare checkpoint and runbook update', 'Review incidents, tune workflows, and finalize operational runbook.', 1, 4, true);

  -- Rebuild intake form for canonical service.
  DELETE FROM public.intake_form_conditions
  WHERE service_template_id = service_id;

  DELETE FROM public.intake_form_fields
  WHERE service_template_id = service_id;

  INSERT INTO public.intake_form_fields (service_template_id, field_name, field_type, label, is_required, order_index, options, help_text)
  VALUES
    (service_id, 'client_legal_entity_country', 'select', 'In which country is the legal entity that will collect payments incorporated?', true, 1, '["United States","United Kingdom","Canada","Norway","Sweden","Denmark","Finland","Other EU/EEA","Other"]'::jsonb, 'Determines processor eligibility. HubSpot Payments is US/UK/CA only. All others must use Stripe.'),
    (service_id, 'hubspot_tier', 'select', 'Which HubSpot Sales Hub or Service Hub tier is active?', true, 2, '["Free","Starter","Professional","Enterprise","Not sure"]'::jsonb, 'Commerce Hub is bundled. Tier determines feature availability (invoices need Starter+, CPQ approvals need Pro+).'),
    (service_id, 'existing_processor', 'select', 'Is a payment processor already in use?', true, 3, '["None — greenfield","Stripe (already connected elsewhere)","HubSpot Payments","Adyen","Klarna","PayPal","Bank transfer / invoicing only","Other"]'::jsonb, null),
    (service_id, 'existing_processor_other', 'text', 'If ''Other'', name the processor', false, 4, null, null),
    (service_id, 'preferred_processor', 'select', 'Preferred processor for Commerce Hub (subject to region eligibility)', true, 5, '["HubSpot Payments (US/UK/CA only)","Stripe","Not sure — recommend"]'::jsonb, null),
    (service_id, 'payment_methods_needed', 'multiselect', 'Which payment methods do you need to support?', true, 6, '["Credit/debit cards","ACH (US)","SEPA","Vipps (Norway)","Klarna","iDEAL (NL)","Bancontact (BE)","Wire/bank transfer","Apple Pay / Google Pay","Other"]'::jsonb, null),
    (service_id, 'currencies_in_scope', 'multiselect', 'Which currencies will you transact in?', true, 7, '["USD","EUR","GBP","NOK","SEK","DKK","CAD","AUD","Other"]'::jsonb, null),
    (service_id, 'product_catalog_size', 'select', 'Approximate number of SKUs in the catalog', true, 8, '["1–10","11–50","51–200","201–1,000","1,000+"]'::jsonb, null),
    (service_id, 'product_catalog_source', 'select', 'Where does the product catalog live today?', true, 9, '["Spreadsheet","ERP (QuickBooks / Xero / other)","Existing HubSpot product library","Stripe product catalog","Custom system / database","Does not exist yet"]'::jsonb, null),
    (service_id, 'revenue_model', 'multiselect', 'Which revenue models apply? (select all that apply)', true, 10, '["One-time sales","Monthly subscriptions","Annual subscriptions","Multi-year contracts","Usage-based / metered","Setup fee + recurring","Deposits + balance","Other"]'::jsonb, null),
    (service_id, 'subscription_complexity', 'radio', 'How complex is the subscription model?', false, 11, '["Simple — flat recurring","Moderate — tiers, proration, discounts","Complex — usage-based, custom cycles, multi-year escalators","Not applicable"]'::jsonb, null),
    (service_id, 'cpq_scope', 'select', 'Is CPQ / quoting part of this project?', true, 12, '["Yes — full CPQ rollout","Yes — basic quotes only","No — invoicing only"]'::jsonb, null),
    (service_id, 'approval_workflows_needed', 'radio', 'Do you need quote approval workflows?', false, 13, '["Yes — single-level (discount/value thresholds)","Yes — multi-step (manager → director → finance)","No"]'::jsonb, 'Approval workflows require Professional tier or higher.'),
    (service_id, 'quote_template_assets_ready', 'radio', 'Are brand assets ready for quote templates? (logo, colors, legal footer, T&Cs)', true, 14, '["Yes — all ready","Partial","No — needs creation"]'::jsonb, null),
    (service_id, 'accounting_system', 'select', 'Which accounting system will HubSpot integrate with?', true, 15, '["QuickBooks Online","Xero","Tripletex","Fortnox","PowerOffice","24SevenOffice","Xledger","Visma","NetSuite","Sage","Other","None — accounting stays manual"]'::jsonb, null),
    (service_id, 'accounting_sync_direction', 'radio', 'What sync direction do you need with accounting?', true, 16, '["One-way: HubSpot → accounting (invoice push only)","One-way: accounting → HubSpot (status sync)","Bidirectional","Not sure — recommend"]'::jsonb, 'Superwork default is one-way HubSpot → accounting unless strong reason otherwise.'),
    (service_id, 'tax_handling', 'select', 'How will tax be calculated?', true, 17, '["Native HubSpot tax (simple flat rate)","Avalara AvaTax (multi-jurisdiction)","Accounting-side (QBO/Xero/Tripletex owns tax)","Not sure — recommend"]'::jsonb, 'For EU/Nordic clients, accounting-side tax is the Superwork default.'),
    (service_id, 'tax_jurisdictions', 'multiselect', 'Which tax jurisdictions apply?', false, 18, '["Norway MVA","EU VAT (single country)","EU VAT (multi-country)","UK VAT","US sales tax (single state)","US sales tax (multi-state)","Canada GST/HST","Reverse-charge B2B (EU)","Other"]'::jsonb, null),
    (service_id, 'invoices_needed', 'radio', 'Do you need native HubSpot invoices?', true, 19, '["Yes — primary invoicing tool","Yes — only for online card collection; ERP is primary","No"]'::jsonb, null),
    (service_id, 'payment_terms_default', 'select', 'Default payment terms', false, 20, '["On receipt","Net 7","Net 14","Net 15","Net 30","Net 45","Net 60","Other"]'::jsonb, null),
    (service_id, 'payment_links_use_cases', 'multiselect', 'Where will you use payment links? (select all that apply)', false, 21, '["One-off service charges","Deposits","Event / workshop tickets","Self-serve upgrades","Embedded on website","Not using payment links"]'::jsonb, null),
    (service_id, 'quote_to_cash_current_state', 'textarea', 'Briefly describe the current quote-to-cash process (tools, handoffs, pain points)', true, 22, null, null),
    (service_id, 'current_pain_points', 'textarea', 'Top 3 pain points in the current quote-to-cash process', true, 23, null, null),
    (service_id, 'user_roles_inventory', 'textarea', 'Users by role (name, email, role: sales / finance / RevOps / admin)', true, 24, null, null),
    (service_id, 'refund_policy_owner', 'text', 'Who will have refund permissions?', true, 25, null, 'Superwork default: finance lead only. Document the exception if broader access is needed.'),
    (service_id, 'compliance_requirements', 'multiselect', 'Compliance and data-residency requirements', false, 26, '["GDPR / Datatilsynet","PCI DSS (via processor)","SOX","PI / PII","Data residency (EU only)","Industry-specific (healthcare, finance)","None specific"]'::jsonb, null),
    (service_id, 'sandbox_available', 'radio', 'Is a HubSpot sandbox available for testing?', false, 27, '["Yes — Enterprise sandbox","No — Pro or Starter account","Not sure"]'::jsonb, null),
    (service_id, 'go_live_target', 'text', 'Target go-live date', true, 28, null, null),
    (service_id, 'pilot_scope', 'radio', 'Do you want to pilot CPQ with one team before full rollout?', false, 29, '["Yes — recommended","No — big-bang rollout","Not applicable (no CPQ)"]'::jsonb, null),
    (service_id, 'primary_kpis', 'multiselect', 'Which KPIs should the rollout improve?', false, 30, '["Quote-to-close time","Quote-to-cash cycle time","Invoice aging","Failed payment rate","Discount leakage","Approval turnaround","MRR/ARR visibility","Churn rate","Other"]'::jsonb, null),
    (service_id, 'existing_middleware', 'select', 'For non-native accounting (Tripletex/Fortnox/etc.), is middleware already in place?', false, 31, '["Yes — Zapier","Yes — Make/n8n","Yes — custom integration","Yes — third-party connector","No — needs to be built","Not applicable"]'::jsonb, null),
    (service_id, 'known_constraints', 'textarea', 'Known blockers or constraints (budget, timeline, legal, technical)', false, 32, null, null),
    (service_id, 'additional_context', 'textarea', 'Anything else Superwork should know before kickoff?', false, 33, null, null);

  -- Optional placeholders/defaults.
  UPDATE public.intake_form_fields
  SET placeholder = 'e.g. Sales creates quote in Word -> emails PDF -> signed via DocuSign -> finance issues invoice in Tripletex manually -> reconciles bank transfer weekly'
  WHERE service_template_id = service_id
    AND field_name = 'quote_to_cash_current_state';

  UPDATE public.intake_form_fields
  SET placeholder = 'Kari Nordmann — kari@example.no — Finance lead'
  WHERE service_template_id = service_id
    AND field_name = 'user_roles_inventory';

  UPDATE public.intake_form_fields
  SET placeholder = 'e.g. 2026-06-01 or end of Q2'
  WHERE service_template_id = service_id
    AND field_name = 'go_live_target';

  -- Conditional logic rules from request.
  INSERT INTO public.intake_form_conditions (
    service_template_id,
    trigger_field_name,
    trigger_value,
    action,
    target_field_names
  )
  VALUES
    (service_id, 'client_legal_entity_country', 'United States', 'show', ARRAY['preferred_processor']),
    (service_id, 'client_legal_entity_country', 'United Kingdom', 'show', ARRAY['preferred_processor']),
    (service_id, 'client_legal_entity_country', 'Canada', 'show', ARRAY['preferred_processor']),
    (service_id, 'existing_processor', 'Other', 'show', ARRAY['existing_processor_other']),
    (service_id, 'revenue_model', 'Monthly subscriptions', 'show', ARRAY['subscription_complexity']),
    (service_id, 'revenue_model', 'Annual subscriptions', 'show', ARRAY['subscription_complexity']),
    (service_id, 'revenue_model', 'Multi-year contracts', 'show', ARRAY['subscription_complexity']),
    (service_id, 'revenue_model', 'Usage-based / metered', 'show', ARRAY['subscription_complexity']),
    (service_id, 'revenue_model', 'Setup fee + recurring', 'show', ARRAY['subscription_complexity']),
    (service_id, 'revenue_model', 'Deposits + balance', 'show', ARRAY['subscription_complexity']),
    (service_id, 'cpq_scope', 'Yes — full CPQ rollout', 'show', ARRAY['approval_workflows_needed', 'quote_template_assets_ready', 'pilot_scope']),
    (service_id, 'cpq_scope', 'Yes — basic quotes only', 'show', ARRAY['quote_template_assets_ready']),
    (service_id, 'tax_handling', 'Native HubSpot tax (simple flat rate)', 'show', ARRAY['tax_jurisdictions']),
    (service_id, 'tax_handling', 'Avalara AvaTax (multi-jurisdiction)', 'show', ARRAY['tax_jurisdictions']),
    (service_id, 'accounting_system', 'Tripletex', 'show', ARRAY['existing_middleware']),
    (service_id, 'accounting_system', 'Fortnox', 'show', ARRAY['existing_middleware']),
    (service_id, 'accounting_system', 'PowerOffice', 'show', ARRAY['existing_middleware']),
    (service_id, 'accounting_system', '24SevenOffice', 'show', ARRAY['existing_middleware']),
    (service_id, 'accounting_system', 'Xledger', 'show', ARRAY['existing_middleware']),
    (service_id, 'accounting_system', 'Visma', 'show', ARRAY['existing_middleware']),
    (service_id, 'accounting_system', 'NetSuite', 'show', ARRAY['existing_middleware']);
END $$;

-- Verification
-- Expected:
-- - service row: 1 (name = HubSpot Commerce Hub Onboarding, category = HubSpot Services, is_active = true)
-- - sop_count: 10
-- - total_task_count: 20
-- - total_field_count: 33
-- - required_field_count: 20
-- - condition_count: 21
SELECT
  st.id,
  st.name,
  st.category,
  st.is_active,
  st.estimated_hours,
  COUNT(DISTINCT ss.id) AS sop_count,
  COUNT(DISTINCT t.id) AS total_task_count
FROM public.service_templates st
LEFT JOIN public.service_sops ss ON ss.service_template_id = st.id
LEFT JOIN public.sop_tasks t ON t.sop_id = ss.id
WHERE st.name = 'HubSpot Commerce Hub Onboarding'
GROUP BY st.id, st.name, st.category, st.is_active, st.estimated_hours;

SELECT
  COUNT(*) FILTER (WHERE f.is_required) AS required_field_count,
  COUNT(*) AS total_field_count
FROM public.intake_form_fields f
JOIN public.service_templates st ON st.id = f.service_template_id
WHERE st.name = 'HubSpot Commerce Hub Onboarding';

SELECT
  COUNT(*) AS condition_count
FROM public.intake_form_conditions c
JOIN public.service_templates st ON st.id = c.service_template_id
WHERE st.name = 'HubSpot Commerce Hub Onboarding';
