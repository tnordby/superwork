# Supabase Database Setup - Correct Order

**IMPORTANT**: These SQL files must be run in the correct order to avoid dependency errors.

## Setup Order

### 1. Run `full-schema.sql` FIRST
This creates the base tables:
- profiles
- projects
- conversations
- messages
- assets
- invoices
- team_members
- account_usage

**How to run**:
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy/paste the contents of `full-schema.sql`
4. Click "Run"

---

### 2. Run `milestones-tasks-schema.sql` SECOND
This creates:
- project_milestones table
- project_tasks table
- Progress calculation trigger

**Dependencies**: Requires `projects` table from step 1

**How to run**:
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy/paste the contents of `milestones-tasks-schema.sql`
4. Click "Run"

---

### 3. Run `quotes-schema.sql` THIRD (Optional - for P5)
This creates the quoting and approval workflow:
- quotes table
- quote_line_items table
- project_assignments table
- Auto-project creation function

**Dependencies**: Requires `projects` table from step 1

**How to run**:
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy/paste the contents of `quotes-schema.sql`
4. Click "Run"

---

### 4. Run `services-schema.sql` FOURTH (For P6)
This creates the service template system:
- service_templates table
- service_sops table
- sop_tasks table
- Template instantiation function
- Progress calculation function

**Dependencies**:
- Requires `projects` table from step 1
- Requires `project_milestones` and `project_tasks` tables from step 2

**How to run**:
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy/paste the contents of `services-schema.sql`
4. Click "Run"

---

## Quick Setup (All at Once)

If you're setting up from scratch, you can run them in order:

```sql
-- 1. Base schema
\i full-schema.sql

-- 2. Milestones and tasks
\i milestones-tasks-schema.sql

-- 3. Quotes (optional)
\i quotes-schema.sql

-- 4. Services (P6)
\i services-schema.sql
```

---

## Verification

After running all schemas, verify everything is set up:

```sql
-- Check all tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected tables:
-- - account_usage
-- - assets
-- - conversations
-- - invoices
-- - messages
-- - profiles
-- - project_milestones
-- - project_phase_changes
-- - project_tasks
-- - projects
-- - quote_line_items
-- - quotes
-- - service_sops
-- - service_templates
-- - sop_tasks
-- - task_status_changes
-- - team_members

-- Check functions exist
SELECT proname FROM pg_proc
WHERE proname IN (
  'instantiate_project_from_template',
  'calculate_project_progress',
  'create_project_from_quote',
  'handle_new_user',
  'handle_updated_at',
  'handle_task_status_change',
  'update_project_progress'
);
```

---

## Common Errors and Solutions

### Error: "relation 'public.projects' does not exist"
**Solution**: Run `full-schema.sql` first

### Error: "relation 'public.project_tasks' does not exist"
**Solution**: Run `milestones-tasks-schema.sql` before `services-schema.sql`

### Error: "function 'handle_updated_at' does not exist"
**Solution**: Run `full-schema.sql` first (it creates this function)

---

## After Setup

Once all schemas are running:

1. **Create sample service templates** (via API or SQL):
```sql
INSERT INTO public.service_templates (name, category, customer_description)
VALUES (
  'HubSpot CRM Setup',
  'HubSpot Services',
  'Complete setup of your HubSpot CRM including objects, properties, pipelines, and workflows'
);
```

2. **Add SOPs to templates**
3. **Add tasks to SOPs**
4. **Test project creation from templates**

---

## Summary

**Correct order**:
1. `full-schema.sql` - Base tables and functions
2. `milestones-tasks-schema.sql` - Milestones and tasks
3. `quotes-schema.sql` (optional) - Quoting workflow
4. `services-schema.sql` - Service templates (P6)

Each file depends on the previous ones, so running them out of order will cause errors.
