# Service Template: [Service Name]

> **Template Version:** 1.0
> **Created:** [Date]
> **Category:** [HubSpot Services | Revenue Operations | Technical Services | AI & Data Services | Marketing Services | Sales Enablement | Other]

---

## 📋 Service Overview

### Service Name
[Full service name as it will appear to customers]

### Customer Description
[2-3 sentences describing what the customer gets. This is public-facing and appears in the service browser]

### Estimated Hours
[Total estimated hours for completion, e.g., 40]

### Is Active
- [ ] Yes (visible to customers)
- [ ] No (hidden from customers)

---

## 🎯 Standard Operating Procedures (SOPs)

> **Note:** SOPs are INTERNAL ONLY and never visible to customers. They guide your team's execution.

### SOP 1: [Phase Name]

**Order Index:** 0
**Description:** [Brief description of what happens in this phase]

#### Tasks
1. **[Task Title]**
   - Description: [What needs to be done]
   - Estimated Hours: [Hours]
   - Is Required: Yes/No

2. **[Task Title]**
   - Description: [What needs to be done]
   - Estimated Hours: [Hours]
   - Is Required: Yes/No

### SOP 2: [Phase Name]

**Order Index:** 1
**Description:** [Brief description of what happens in this phase]

#### Tasks
1. **[Task Title]**
   - Description: [What needs to be done]
   - Estimated Hours: [Hours]
   - Is Required: Yes/No

### SOP 3: [Phase Name]

**Order Index:** 2
**Description:** [Brief description of what happens in this phase]

#### Tasks
1. **[Task Title]**
   - Description: [What needs to be done]
   - Estimated Hours: [Hours]
   - Is Required: Yes/No

---

## 📝 Intake Form Configuration

> **Purpose:** Define what information you need to collect from customers when they request this service.

### Form Fields

#### 1. [Field Name]
- **Field Type:** text | textarea | select | multiselect | number | date | email | url | checkbox | radio
- **Label:** [What the customer sees]
- **Placeholder:** [Example input]
- **Required:** Yes/No
- **Help Text:** [Optional guidance for the customer]
- **Options:** [For select/radio/multiselect fields]
  - Option 1
  - Option 2
  - Option 3
- **Validation:** [Any special validation rules]
- **Default Value:** [If applicable]

#### 2. [Field Name]
- **Field Type:** text | textarea | select | multiselect | number | date | email | url | checkbox | radio
- **Label:** [What the customer sees]
- **Placeholder:** [Example input]
- **Required:** Yes/No
- **Help Text:** [Optional guidance for the customer]

#### 3. [Field Name]
- **Field Type:** text | textarea | select | multiselect | number | date | email | url | checkbox | radio
- **Label:** [What the customer sees]
- **Placeholder:** [Example input]
- **Required:** Yes/No
- **Help Text:** [Optional guidance for the customer]

### Conditional Logic
> Define fields that show/hide based on other field values

**Rule 1:**
- If `[Field Name]` equals `[Value]`
- Then show: `[Field Names]`
- Then hide: `[Field Names]`

**Rule 2:**
- If `[Field Name]` equals `[Value]`
- Then show: `[Field Names]`

---

## 🎨 Presentation

### Icon Selection
**Suggested Icon:** [Rocket | Database | RefreshCw | Sparkles | Target | TrendingUp | Users | BarChart3 | Heart | Code | Workflow | Boxes | Globe | Zap | Bot | CheckCircle | Shield | LineChart]

### Color Gradient
**Gradient Class:** [e.g., from-green-400 to-green-600 | from-blue-400 to-indigo-600 | from-cyan-400 to-blue-600]

---

## 💼 Pricing & Scoping

### Pricing Model
- [ ] Fixed Price
- [ ] Hourly
- [ ] Retainer
- [ ] Custom Quote Required

### Base Price (if fixed)
$[Amount]

### Price Range (if variable)
$[Min] - $[Max]

### Scoping Questions
1. [Question that affects pricing]
2. [Question that affects pricing]
3. [Question that affects pricing]

---

## 📊 Success Metrics

### Deliverables
- [ ] [Deliverable 1]
- [ ] [Deliverable 2]
- [ ] [Deliverable 3]

### Success Criteria
1. [How you measure success]
2. [How you measure success]
3. [How you measure success]

---

## 🔧 Implementation SQL

```sql
-- =============================================
-- SERVICE: [Service Name]
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
    '[Service Name]',
    '[Category]',
    '[Customer Description]',
    [Estimated Hours],
    true
  ) RETURNING id INTO service_id;

  -- SOP 1: [Phase Name]
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    '[SOP 1 Title]',
    '[SOP 1 Description]',
    0
  ) RETURNING id INTO sop1_id;

  -- Tasks for SOP 1
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop1_id, '[Task 1 Title]', '[Task 1 Description]', 0, [Hours]),
    (sop1_id, '[Task 2 Title]', '[Task 2 Description]', 1, [Hours]),
    (sop1_id, '[Task 3 Title]', '[Task 3 Description]', 2, [Hours]);

  -- SOP 2: [Phase Name]
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    '[SOP 2 Title]',
    '[SOP 2 Description]',
    1
  ) RETURNING id INTO sop2_id;

  -- Tasks for SOP 2
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop2_id, '[Task 1 Title]', '[Task 1 Description]', 0, [Hours]),
    (sop2_id, '[Task 2 Title]', '[Task 2 Description]', 1, [Hours]);

  -- SOP 3: [Phase Name]
  INSERT INTO public.service_sops (service_template_id, title, description, order_index)
  VALUES (
    service_id,
    '[SOP 3 Title]',
    '[SOP 3 Description]',
    2
  ) RETURNING id INTO sop3_id;

  -- Tasks for SOP 3
  INSERT INTO public.sop_tasks (sop_id, title, description, order_index, estimated_hours) VALUES
    (sop3_id, '[Task 1 Title]', '[Task 1 Description]', 0, [Hours]),
    (sop3_id, '[Task 2 Title]', '[Task 2 Description]', 1, [Hours]);

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
WHERE st.name = '[Service Name]'
GROUP BY st.id, st.name, st.category, st.estimated_hours;
```

---

## 📚 Notes & Considerations

### Prerequisites
- [What the customer needs before starting]
- [What the customer needs before starting]

### Assumptions
- [What you're assuming about scope]
- [What you're assuming about scope]

### Out of Scope
- [What's explicitly not included]
- [What's explicitly not included]

### Dependencies
- [Other services or tools required]
- [Other services or tools required]

---

## 🔄 Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Name] | Initial creation |
