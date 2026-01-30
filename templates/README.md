# Service Templates Guide

This directory contains templates for creating new service offerings in Superwork.

## 📁 Files

- **`service-template.md`** - Blank template for creating new services
- **`example-hubspot-marketing-onboarding.md`** - Complete example showing how to fill out a service template

## 🚀 Quick Start

### 1. Create a New Service

1. Copy `service-template.md` to a new file
2. Name it descriptively (e.g., `salesforce-migration-service.md`)
3. Fill out all sections
4. Review the example file for guidance

### 2. Define Your Service

Complete these key sections:

- **Service Overview** - Customer-facing name and description
- **SOPs (Standard Operating Procedures)** - Internal execution steps
- **Intake Form** - What information you need from customers
- **Pricing & Scoping** - How you charge and what affects pricing

### 3. Implement in Database

Once your service is defined:

1. Copy the SQL from the "Implementation SQL" section
2. Open Supabase SQL Editor
3. Run the SQL to create the service
4. Verify with the verification query at the bottom

### 4. Access in Admin UI

After running the SQL:

1. Go to `/admin/services`
2. Your new service should appear
3. Edit SOPs and tasks as needed
4. Toggle `is_active` to make it visible to customers

## 📋 Template Sections Explained

### Service Overview
Basic information about the service:
- **Name**: What customers see
- **Category**: Groups similar services
- **Customer Description**: Public-facing description (2-3 sentences)
- **Estimated Hours**: Expected delivery time
- **Is Active**: Whether customers can see/request it

### SOPs (Standard Operating Procedures)
**Internal only** - Never shown to customers. These guide your team:
- Break work into phases (Discovery, Implementation, Training, etc.)
- Each SOP becomes a milestone in projects
- Tasks under each SOP become checklist items
- Use `order_index` to control sequence

### Intake Form Configuration
Define what information you need to collect:
- **Field Types**: text, textarea, select, multiselect, number, date, email, url, checkbox, radio
- **Validation**: Required fields, format requirements
- **Conditional Logic**: Show/hide fields based on other answers
- **Help Text**: Guide customers on what to provide

> **Note:** Intake forms are not yet implemented in the UI. This section documents what should be collected when the feature is built.

### Presentation
Visual elements for the service browser:
- **Icon**: From lucide-react icon set
- **Gradient**: Tailwind gradient classes for card backgrounds

### Pricing & Scoping
How you charge for the service:
- **Model**: Fixed price, hourly, retainer, or custom quote
- **Base Price**: Starting price for fixed-price services
- **Scoping Questions**: What affects complexity/pricing

### Success Metrics
What customers get and how you measure success:
- **Deliverables**: Tangible outputs
- **Success Criteria**: How you know it's done right

### Implementation SQL
Ready-to-run SQL that creates:
- Service template record
- All SOPs (phases)
- All tasks under each SOP

## 💡 Best Practices

### Writing Good Service Descriptions
✅ **Do:**
- Focus on customer outcomes, not your process
- Use active voice ("We'll configure your CRM")
- Mention specific deliverables
- Keep it to 2-3 sentences

❌ **Don't:**
- Use jargon or technical terms customers won't understand
- List every single task you'll do
- Make vague promises
- Write more than 3 sentences

**Example:**
> ✅ "Complete setup of your HubSpot CRM including custom objects, properties, deal pipelines, and user permissions. Get your team up and running with a fully configured CRM."
>
> ❌ "We will perform a comprehensive analysis of your business requirements followed by schema design, implementation of data structures, configuration of security permissions, and ongoing optimization."

### Creating Effective SOPs

1. **Keep phases distinct** - Each SOP should be a clear phase of work
2. **Use consistent naming** - Discovery, Implementation, Training, etc.
3. **Be specific with tasks** - "Configure contact properties" not "Set up stuff"
4. **Estimate realistically** - Track actual time to improve estimates
5. **Mark required tasks** - Some tasks are optional based on scope

### Designing Intake Forms

1. **Start with basics** - Name, email, company are usually needed
2. **Ask "why"** - What's their goal? What's the current situation?
3. **Understand scale** - Size of data, number of users, complexity factors
4. **Technical details** - Current tools, integration needs, constraints
5. **Use conditional logic** - Only show fields when relevant
6. **Provide help text** - Guide customers on what to provide

### Scoping for Pricing

Consider what varies:
- Data volume (more records = more time)
- Complexity (simple vs. advanced features)
- Customization (templates vs. custom builds)
- Integrations (number and complexity)
- Training needs (team size, skill level)

## 🔄 Workflow

```
1. Fill out service-template.md
   ↓
2. Review with team
   ↓
3. Run SQL in Supabase
   ↓
4. Verify in admin UI (/admin/services)
   ↓
5. Adjust SOPs/tasks if needed
   ↓
6. Set is_active = true
   ↓
7. Service appears in customer browser
```

## 🎯 Categories

Use these standard categories:

- **HubSpot Services** - HubSpot-specific implementations
- **Revenue Operations** - Sales/marketing process design
- **Technical Services** - Custom development, APIs, integrations
- **AI & Data Services** - AI, data enrichment, analytics
- **Marketing Services** - Marketing automation, campaigns
- **Sales Enablement** - Sales tools, training, content
- **Other** - Anything that doesn't fit above

## 📊 Example Services by Category

### HubSpot Services
- HubSpot CRM Setup
- CRM Data Migration
- HubSpot Marketing Hub Onboarding
- HubSpot Sales Hub Implementation
- Service Hub Configuration

### Revenue Operations
- Sales Process Design
- Lead Scoring Implementation
- Revenue Attribution Modeling
- Sales Forecasting Setup

### Technical Services
- Custom API Integration
- Programmable Automation
- Custom HubSpot Objects
- CRM Extensions Development

### AI & Data Services
- Data Enrichment Setup
- Predictive Lead Scoring
- AI Agent Deployment
- Data Quality Automation

## 🆘 Getting Help

### Common Questions

**Q: How many SOPs should I create?**
A: Typically 3-5. Think in phases: Discovery, Implementation, Testing/Training.

**Q: How detailed should tasks be?**
A: Detailed enough that a team member could execute without asking questions. Include what needs to be done and why.

**Q: What if my service varies a lot by customer?**
A: Create a base template with required SOPs/tasks. Mark optional tasks as `is_required: false`. Use intake form to understand variations.

**Q: Can I have multiple services in one template?**
A: No. Each service template is separate. If you have tiers (Basic/Pro/Enterprise), create separate templates.

**Q: How do I handle add-ons?**
A: Create separate service templates for add-ons. Customers can request multiple services.

## 📝 Template Checklist

Before running SQL, verify:

- [ ] Service name is clear and customer-friendly
- [ ] Category matches standard categories
- [ ] Customer description is 2-3 sentences
- [ ] Estimated hours covers all tasks
- [ ] SOPs are in logical order
- [ ] Tasks are specific and actionable
- [ ] Estimated hours per task are realistic
- [ ] Intake form captures all needed information
- [ ] Pricing model is clear
- [ ] Deliverables are specific and measurable
- [ ] SQL syntax is correct (no missing commas, quotes)

## 🔍 Review Questions

Ask yourself:

1. Would a customer understand what they're buying?
2. Could a team member execute this without asking questions?
3. Does the pricing reflect the estimated hours?
4. Are the success criteria measurable?
5. Is anything missing that would cause scope creep?

## 📈 Maintenance

### Updating Existing Services

**Via Admin UI:**
1. Go to `/admin/services`
2. Click service name
3. Edit details and save
4. Go to SOPs tab to edit phases
5. Go to tasks tab to edit checklist items

**Via SQL:**
```sql
-- Update service details
UPDATE service_templates
SET
  customer_description = 'New description',
  estimated_hours = 50,
  updated_at = now()
WHERE name = 'Service Name';

-- Update SOP
UPDATE service_sops
SET
  title = 'New Title',
  description = 'New description',
  updated_at = now()
WHERE id = '[sop-uuid]';

-- Update task
UPDATE sop_tasks
SET
  title = 'New Title',
  estimated_hours = 5,
  updated_at = now()
WHERE id = '[task-uuid]';
```

### Tracking Changes

Keep your markdown templates updated when you modify services:
1. Update the markdown file
2. Increment version in "Version History"
3. Document what changed
4. Commit to git

This creates an audit trail and documentation.

## 🚀 Next Steps

1. **Create your first service** using the template
2. **Review the example** to understand best practices
3. **Run the SQL** in Supabase to implement
4. **Test the service** by creating a project
5. **Iterate based on feedback** from your team and customers

---

**Need help?** Open an issue or ask in team chat.
