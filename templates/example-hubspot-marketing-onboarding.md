# Service Template: HubSpot Marketing Hub Onboarding

> **Template Version:** 1.0
> **Created:** 2026-01-30
> **Category:** Marketing Services

---

## 📋 Service Overview

### Service Name
HubSpot Marketing Hub Onboarding

### Customer Description
Fast-track your marketing operations with a complete Marketing Hub setup. We'll configure email templates, landing pages, forms, workflows, and reporting dashboards tailored to your marketing strategy and brand guidelines.

### Estimated Hours
35

### Is Active
- [x] Yes (visible to customers)
- [ ] No (hidden from customers)

---

## 🎯 Standard Operating Procedures (SOPs)

> **Note:** SOPs are INTERNAL ONLY and never visible to customers. They guide your team's execution.

### SOP 1: Discovery & Brand Setup

**Order Index:** 0
**Description:** Understand marketing goals, gather brand assets, and configure account settings

#### Tasks
1. **Conduct marketing strategy call**
   - Description: Interview marketing team to understand goals, target audience, and current challenges
   - Estimated Hours: 2
   - Is Required: Yes

2. **Collect brand assets**
   - Description: Gather logos, brand colors, fonts, and brand guidelines documentation
   - Estimated Hours: 1
   - Is Required: Yes

3. **Configure account settings**
   - Description: Set up company name, domain, brand kit in Marketing Hub
   - Estimated Hours: 1.5
   - Is Required: Yes

4. **Set up email sending domain**
   - Description: Configure and verify custom email sending domain with DNS records
   - Estimated Hours: 2
   - Is Required: Yes

### SOP 2: Marketing Assets Creation

**Order Index:** 1
**Description:** Build branded templates, forms, and landing pages

#### Tasks
1. **Design email templates**
   - Description: Create 3-5 branded email templates (newsletter, promotional, nurture)
   - Estimated Hours: 6
   - Is Required: Yes

2. **Build landing page templates**
   - Description: Create 2-3 landing page templates aligned to conversion goals
   - Estimated Hours: 5
   - Is Required: Yes

3. **Create form library**
   - Description: Build 3-5 forms (newsletter signup, content download, demo request)
   - Estimated Hours: 3
   - Is Required: Yes

4. **Set up thank you pages**
   - Description: Create confirmation pages for each form submission type
   - Estimated Hours: 2
   - Is Required: Yes

### SOP 3: Automation & Reporting

**Order Index:** 2
**Description:** Configure workflows, lead scoring, and analytics

#### Tasks
1. **Build welcome workflow**
   - Description: Create automated welcome email sequence for new subscribers
   - Estimated Hours: 3
   - Is Required: Yes

2. **Set up lead scoring**
   - Description: Configure lead scoring based on engagement and demographics
   - Estimated Hours: 2.5
   - Is Required: Yes

3. **Create marketing dashboard**
   - Description: Build custom dashboard showing email performance, form conversions, and landing page metrics
   - Estimated Hours: 3
   - Is Required: Yes

4. **Configure UTM tracking**
   - Description: Set up campaign tracking parameters and attribution reporting
   - Estimated Hours: 2
   - Is Required: Yes

5. **Conduct training session**
   - Description: Train marketing team on using Marketing Hub (email, landing pages, workflows)
   - Estimated Hours: 2
   - Is Required: Yes

---

## 📝 Intake Form Configuration

> **Purpose:** Define what information you need to collect from customers when they request this service.

### Form Fields

#### 1. Company Website
- **Field Type:** url
- **Label:** Company Website URL
- **Placeholder:** https://www.example.com
- **Required:** Yes
- **Help Text:** We'll use this to configure your email sending domain
- **Validation:** Must be valid URL

#### 2. Current Email Marketing Tool
- **Field Type:** select
- **Label:** What email marketing tool are you currently using?
- **Required:** Yes
- **Options:**
  - None (starting fresh)
  - Mailchimp
  - Constant Contact
  - ActiveCampaign
  - SendGrid
  - Other

#### 3. Brand Assets Ready
- **Field Type:** radio
- **Label:** Do you have brand assets ready (logo, colors, fonts)?
- **Required:** Yes
- **Options:**
  - Yes, we have everything
  - Partially - need help
  - No, need full branding support

#### 4. Primary Marketing Goals
- **Field Type:** multiselect
- **Label:** What are your primary marketing goals? (Select all that apply)
- **Required:** Yes
- **Options:**
  - Generate more leads
  - Nurture existing leads
  - Increase email engagement
  - Build brand awareness
  - Drive event registrations
  - Content distribution
- **Help Text:** Select up to 3 priorities

#### 5. Email List Size
- **Field Type:** select
- **Label:** Approximate size of your email contact list
- **Required:** Yes
- **Options:**
  - 0-1,000 contacts
  - 1,000-5,000 contacts
  - 5,000-10,000 contacts
  - 10,000-25,000 contacts
  - 25,000+ contacts

#### 6. Email Send Frequency
- **Field Type:** select
- **Label:** How often do you plan to send marketing emails?
- **Required:** Yes
- **Options:**
  - Weekly
  - Bi-weekly
  - Monthly
  - As needed
  - Not sure yet

#### 7. Landing Page Needs
- **Field Type:** textarea
- **Label:** What types of landing pages do you need?
- **Placeholder:** e.g., Webinar registration, eBook download, demo request
- **Required:** Yes
- **Help Text:** List 3-5 primary landing page types you'll use

#### 8. Form Requirements
- **Field Type:** textarea
- **Label:** What information do you need to collect from leads?
- **Placeholder:** e.g., Name, email, company, role, company size
- **Required:** Yes
- **Help Text:** List the fields you typically collect

#### 9. Integration Needs
- **Field Type:** multiselect
- **Label:** Which tools do you need to integrate with Marketing Hub?
- **Required:** No
- **Options:**
  - Salesforce
  - WordPress
  - Shopify
  - Zoom
  - Google Analytics
  - Facebook Ads
  - LinkedIn Ads
  - Other (specify in notes)

#### 10. Special Requirements
- **Field Type:** textarea
- **Label:** Any specific requirements or preferences?
- **Placeholder:** e.g., Must comply with healthcare regulations, need GDPR-compliant forms, specific automation scenarios
- **Required:** No
- **Help Text:** Tell us about any unique needs or constraints

### Conditional Logic

**Rule 1:**
- If `Brand Assets Ready` equals `No, need full branding support`
- Then show: `Branding Budget` field (select: $5k-10k, $10k-20k, $20k+)

**Rule 2:**
- If `Current Email Marketing Tool` does not equal `None (starting fresh)`
- Then show: `Migration Needed` checkbox and `List Size to Migrate` number field

---

## 🎨 Presentation

### Icon Selection
**Suggested Icon:** Heart

### Color Gradient
**Gradient Class:** from-pink-400 to-rose-600

---

## 💼 Pricing & Scoping

### Pricing Model
- [x] Fixed Price
- [ ] Hourly
- [ ] Retainer
- [ ] Custom Quote Required

### Base Price (if fixed)
$8,500

### Price Range (if variable)
$8,500 - $12,000 (depending on complexity and integrations)

### Scoping Questions
1. How many email templates do you need? (Base includes 5)
2. How many landing page templates? (Base includes 3)
3. How many custom workflows beyond welcome series? (Base includes 1)
4. Do you need data migration from another platform?
5. Do you need custom API integrations?

---

## 📊 Success Metrics

### Deliverables
- [x] 5 branded email templates
- [x] 3 landing page templates
- [x] 5 form templates
- [x] Welcome automation workflow
- [x] Lead scoring model
- [x] Marketing performance dashboard
- [x] Custom email sending domain configured
- [x] Team training documentation
- [x] 2-hour training session

### Success Criteria
1. Marketing team can independently send campaigns within 2 days of completion
2. All templates match brand guidelines
3. Forms collecting data properly and integrating with CRM
4. Email deliverability rate above 95%
5. Team feels confident using the platform

---

## 🔧 Implementation SQL

```sql
-- =============================================
-- SERVICE: HubSpot Marketing Hub Onboarding
-- =============================================

DO $$
DECLARE
  service_id uuid;
  sop1_id uuid;
  sop2_id uuid;
  sop3_id uuid;
BEGIN
  -- Create Service Template
  INSERT INTO public.service_templates (name, category, customer_description, estimated_hours, is_active)
  VALUES (
    'HubSpot Marketing Hub Onboarding',
    'Marketing Services',
    'Fast-track your marketing operations with a complete Marketing Hub setup. We''ll configure email templates, landing pages, forms, workflows, and reporting dashboards tailored to your marketing strategy and brand guidelines.',
    35,
    true
  ) RETURNING id INTO service_id;

  -- SOP 1: Discovery & Brand Setup
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    'Discovery & Brand Setup',
    'Understand marketing goals, gather brand assets, and configure account settings',
    0
  ) RETURNING id INTO sop1_id;

  -- Tasks for SOP 1
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop1_id, 'Conduct marketing strategy call', 'Interview marketing team to understand goals, target audience, and current challenges', 0, 2),
    (sop1_id, 'Collect brand assets', 'Gather logos, brand colors, fonts, and brand guidelines documentation', 1, 1),
    (sop1_id, 'Configure account settings', 'Set up company name, domain, brand kit in Marketing Hub', 2, 1.5),
    (sop1_id, 'Set up email sending domain', 'Configure and verify custom email sending domain with DNS records', 3, 2);

  -- SOP 2: Marketing Assets Creation
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    'Marketing Assets Creation',
    'Build branded templates, forms, and landing pages',
    1
  ) RETURNING id INTO sop2_id;

  -- Tasks for SOP 2
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop2_id, 'Design email templates', 'Create 3-5 branded email templates (newsletter, promotional, nurture)', 0, 6),
    (sop2_id, 'Build landing page templates', 'Create 2-3 landing page templates aligned to conversion goals', 1, 5),
    (sop2_id, 'Create form library', 'Build 3-5 forms (newsletter signup, content download, demo request)', 2, 3),
    (sop2_id, 'Set up thank you pages', 'Create confirmation pages for each form submission type', 3, 2);

  -- SOP 3: Automation & Reporting
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    'Automation & Reporting',
    'Configure workflows, lead scoring, and analytics',
    2
  ) RETURNING id INTO sop3_id;

  -- Tasks for SOP 3
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop3_id, 'Build welcome workflow', 'Create automated welcome email sequence for new subscribers', 0, 3),
    (sop3_id, 'Set up lead scoring', 'Configure lead scoring based on engagement and demographics', 1, 2.5),
    (sop3_id, 'Create marketing dashboard', 'Build custom dashboard showing email performance, form conversions, and landing page metrics', 2, 3),
    (sop3_id, 'Configure UTM tracking', 'Set up campaign tracking parameters and attribution reporting', 3, 2),
    (sop3_id, 'Conduct training session', 'Train marketing team on using Marketing Hub (email, landing pages, workflows)', 4, 2);

END $$;

-- Verify creation
SELECT
  st.name,
  st.category,
  st.estimated_hours,
  count(DISTINCT ss.id) as sop_count,
  count(st2.id) as task_count
FROM service_templates st
LEFT JOIN service_sops ss ON ss.service_template_id = st.id
LEFT JOIN sop_tasks st2 ON st2.sop_id = ss.id
WHERE st.name = 'HubSpot Marketing Hub Onboarding'
GROUP BY st.id, st.name, st.category, st.estimated_hours;
```

---

## 📚 Notes & Considerations

### Prerequisites
- Customer must have HubSpot Marketing Hub Professional or Enterprise license
- Customer should have brand guidelines or at least logo and color palette
- Customer needs access to domain DNS settings for email authentication

### Assumptions
- Customer has fewer than 3 unique landing page templates needed
- Customer has fewer than 5 unique email templates needed
- Customer's branding is already established (not creating new brand identity)
- Customer needs standard lead scoring (not advanced predictive scoring)

### Out of Scope
- Custom API development or complex integrations
- Content creation (copy, images, videos)
- SEO optimization
- Social media integration beyond basic settings
- Advanced reporting (custom reports beyond standard dashboard)
- Ongoing campaign management
- Design of new brand identity

### Dependencies
- HubSpot Marketing Hub license must be active
- Customer must provide brand assets within 3 business days
- Customer must provide DNS access for email domain setup
- Customer stakeholders must be available for discovery call and training

---

## 🔄 Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | Superwork Team | Initial creation |
