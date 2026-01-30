# Intake Forms Setup Guide

This guide explains how to set up the intake form system for HubSpot Sales Onboarding and other services.

## 🎯 What You're Setting Up

When a customer selects "HubSpot Sales Onboarding" from the services browser, they will see a custom intake form asking specific questions about:
- Which Sales Hub tier they're on
- Number of sales reps
- Sales roles and motions
- Current CRM state
- Reporting requirements
- Tool integrations

These responses are saved to the database and can be viewed by your team when delivering the service.

## 📋 Step-by-Step Setup

### Step 1: Run the Database Schema

First, create the intake forms tables in Supabase:

```bash
# Open Supabase SQL Editor
# Paste and run the contents of this file:
```

File: `/Users/thorsteinnordby/Desktop/Projects/superwork/supabase/intake-forms-schema.sql`

This creates:
- `intake_form_fields` - Field definitions
- `intake_form_conditions` - Conditional logic rules
- `project_intake_responses` - Customer responses
- RLS policies for security

### Step 2: Create the HubSpot Sales Onboarding Service

Run the service creation SQL:

```bash
# In Supabase SQL Editor
# Paste and run:
```

File: `/Users/thorsteinnordby/Desktop/Projects/superwork/supabase/hubspot-sales-onboarding-service.sql`

This creates:
- Service template with 60 hours estimate
- 3 SOPs (Account/Users/CRM → Sales Process → Automation/Reporting)
- 11 tasks across all SOPs

### Step 3: Add the Intake Form Configuration

Run the intake form configuration SQL:

```bash
# In Supabase SQL Editor
# Paste and run:
```

File: `/Users/thorsteinnordby/Desktop/Projects/superwork/supabase/hubspot-sales-onboarding-intake-form.sql`

This creates:
- 8 intake form fields
- 1 conditional logic rule (show reporting when no defined process)

### Step 4: Verify Setup

Run these queries in Supabase to verify everything was created:

```sql
-- Check service exists
SELECT * FROM service_templates WHERE name = 'HubSpot Sales Onboarding';

-- Check SOPs and tasks
SELECT
  st.name,
  count(DISTINCT ss.id) as sop_count,
  count(st2.id) as task_count
FROM service_templates st
LEFT JOIN service_sops ss ON ss.service_template_id = st.id
LEFT JOIN sop_tasks st2 ON st2.sop_id = ss.id
WHERE st.name = 'HubSpot Sales Onboarding'
GROUP BY st.id, st.name;

-- Check intake form fields
SELECT
  field_name,
  field_type,
  label,
  is_required
FROM intake_form_fields iff
JOIN service_templates st ON st.id = iff.service_template_id
WHERE st.name = 'HubSpot Sales Onboarding'
ORDER BY order_index;
```

Expected results:
- ✅ 1 service template
- ✅ 3 SOPs
- ✅ 11 tasks
- ✅ 8 intake form fields

## 🚀 Testing the Flow

### 1. Browse Services
1. Go to `/projects?tab=browse`
2. Find "HubSpot Sales Onboarding" in the HubSpot Services category
3. Click the service card

### 2. See the Intake Form
You should be redirected to `/projects/create?templateId=[uuid]` and see:
- Service name as the title
- "Complete this brief to get started with your project"
- 8 form fields:
  - Sales Hub tier (dropdown)
  - Number of sales reps (number)
  - Sales roles (multi-select)
  - Sales motions (multi-select)
  - Current CRM state (dropdown)
  - Defined sales process (radio)
  - Reporting requirements (textarea) - only shows if "No" to defined process
  - Tool integrations (multi-select)

### 3. Fill and Submit
1. Fill out the form
2. Click "Create Project"
3. You'll be redirected to the project page
4. The project will have:
   - All SOPs and tasks from the template
   - Intake responses saved in the database

### 4. View Responses (For Admins)

To see what customers submitted, query:

```sql
SELECT
  p.name as project_name,
  st.name as service_name,
  pir.responses
FROM project_intake_responses pir
JOIN projects p ON p.id = pir.project_id
JOIN service_templates st ON st.id = pir.service_template_id
WHERE st.name = 'HubSpot Sales Onboarding';
```

The `responses` column is JSONB containing all answers:

```json
{
  "sales_hub_tier": "Sales Hub Enterprise",
  "num_sales_reps": "10",
  "sales_roles": ["SDR", "Account Executive", "Sales Manager"],
  "sales_motion": ["Outbound", "Inbound"],
  "current_crm_state": "Existing portal needing cleanup",
  "defined_sales_process": "Partially",
  "reporting_requirements": "",
  "tool_integrations": ["Gmail", "Slack"]
}
```

## 🔧 How It Works

### Architecture

1. **Database Tables:**
   - `service_templates` - The services you offer
   - `intake_form_fields` - Custom fields per service
   - `intake_form_conditions` - Show/hide logic
   - `project_intake_responses` - Customer answers

2. **API Endpoints:**
   - `GET /api/services/[id]/intake-form` - Fetch form config
   - `POST /api/projects/[id]/intake-response` - Save responses
   - `GET /api/projects/[id]/intake-response` - Retrieve responses

3. **UI Components:**
   - `DynamicIntakeForm.tsx` - Renders any intake form dynamically
   - `page.tsx` - Project creation flow
   - Detects if service has intake form
   - Shows dynamic form instead of generic form

### Field Types Supported

- `text` - Single line input
- `textarea` - Multi-line input
- `number` - Numeric input with validation
- `email` - Email with validation
- `url` - URL with validation
- `select` - Dropdown (single choice)
- `multiselect` - Checkboxes (multiple choice)
- `radio` - Radio buttons (single choice)
- `checkbox` - Single yes/no

### Conditional Logic

Fields can show/hide based on other field values:

```sql
-- Example: Show "reporting_requirements" only when "defined_sales_process" = "No"
INSERT INTO intake_form_conditions (
  service_template_id,
  trigger_field_name,
  trigger_value,
  action,
  target_field_names
) VALUES (
  service_id,
  'defined_sales_process',
  'No',
  'show',
  ARRAY['reporting_requirements']
);
```

## 📝 Adding More Services with Intake Forms

### 1. Create Service Template

Follow the template in `/templates/service-template.md`

### 2. Run Service Creation SQL

Use `/templates/example-hubspot-marketing-onboarding.md` as a guide

### 3. Add Intake Form Fields

```sql
DO $$
DECLARE
  service_id uuid;
BEGIN
  -- Get service ID
  SELECT id INTO service_id
  FROM service_templates
  WHERE name = 'Your Service Name';

  -- Add fields
  INSERT INTO intake_form_fields (
    service_template_id,
    field_name,
    field_type,
    label,
    is_required,
    order_index,
    options -- for select/multiselect
  ) VALUES
    (service_id, 'field_1', 'text', 'Question 1', true, 0, null),
    (service_id, 'field_2', 'select', 'Question 2', true, 1, '["Option A", "Option B"]'::jsonb);

  -- Add conditional logic if needed
  INSERT INTO intake_form_conditions (
    service_template_id,
    trigger_field_name,
    trigger_value,
    action,
    target_field_names
  ) VALUES (
    service_id,
    'field_2',
    'Option B',
    'show',
    ARRAY['field_3']
  );
END $$;
```

### 4. Test

The dynamic form will automatically render for any service with intake form fields.

## 🎨 Customization

### Field Help Text

Add guidance below fields:

```sql
help_text: 'We need this to configure your domain authentication'
```

### Field Validation

For number fields:

```sql
validation: '{"min": 1, "max": 1000}'::jsonb
```

### Default Values

Pre-fill fields:

```sql
default_value: 'Sales Hub Professional'
```

### Placeholder Text

Show examples:

```sql
placeholder: 'e.g., 5-10 reps'
```

## 🐛 Troubleshooting

### Form Not Showing

**Problem:** Generic form shows instead of intake form

**Solutions:**
1. Check service has intake form fields:
   ```sql
   SELECT * FROM intake_form_fields
   WHERE service_template_id = '[service-uuid]';
   ```
2. Clear browser cache
3. Check browser console for errors

### Fields Not Visible

**Problem:** Expected fields don't appear

**Solutions:**
1. Check conditional logic isn't hiding them
2. Verify `order_index` is set correctly
3. Check RLS policies allow viewing

### Responses Not Saving

**Problem:** Form submits but responses aren't in database

**Solutions:**
1. Check API endpoint is working:
   ```bash
   curl -X POST http://localhost:3000/api/projects/[id]/intake-response \
     -H "Content-Type: application/json" \
     -d '{"serviceTemplateId": "...", "responses": {...}}'
   ```
2. Check RLS policies allow insert
3. Verify project_id exists

## 📚 Related Files

### Database
- `/supabase/intake-forms-schema.sql` - Table definitions
- `/supabase/hubspot-sales-onboarding-service.sql` - Service + SOPs
- `/supabase/hubspot-sales-onboarding-intake-form.sql` - Form fields

### API
- `/app/api/services/[id]/intake-form/route.ts` - Get form config
- `/app/api/projects/[id]/intake-response/route.ts` - Save/get responses

### UI
- `/app/projects/create/DynamicIntakeForm.tsx` - Form renderer
- `/app/projects/create/page.tsx` - Project creation flow

### Templates
- `/templates/service-template.md` - Blank template
- `/templates/example-hubspot-marketing-onboarding.md` - Complete example
- `/templates/README.md` - Guide

## 🎯 Next Steps

1. ✅ Run all SQL files in order
2. ✅ Test the HubSpot Sales Onboarding flow
3. 📋 Create intake forms for other services
4. 🎨 Build admin UI to view/edit intake forms
5. 📊 Build admin UI to view customer responses
6. 📧 Email intake responses to team when project created

## 🆘 Support

If you encounter issues:
1. Check Supabase logs for errors
2. Check browser console for client errors
3. Verify RLS policies with test queries
4. Review this document's troubleshooting section

---

**Created:** 2026-01-30
**Version:** 1.0
