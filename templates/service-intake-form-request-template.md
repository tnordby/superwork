# Service Intake Form Request Template

Use this template when you want me to create/update a custom brief (intake form) for a service template.

Copy this, fill it out, and send it back.

---

## 1) Service

- Service name (exact in admin): 
- Category:
- Existing service template ID (if known):
- New service or existing service update? (`new` / `update`):
- Intake form required for this service? (`yes` / `no`):
- For updates, confirm identity using at least one:
  - Existing service template ID, or
  - exact service name + category

## 2) Brief goal

- What should this brief help us learn before delivery?
- Who will fill it out? (`customer admin`, `marketer`, `sales lead`, etc.)
- About how long should it take? (`3 min`, `5 min`, etc.)

## 3) Fields

Add one block per field:

```text
Field:
- key: snake_case_key
- label: Human-readable question label
- type: text | textarea | number | email | url | select | radio | checkbox | multiselect
- required: true | false
- order: 1
- options: [only for select/radio/multiselect]
- placeholder: optional
- help_text: optional
- default_value: optional
- validation: optional JSON (example: {"min":1,"max":100})
- remove_existing_fields_not_listed: true | false (optional, for updates)
```

## 4) Conditional logic (optional)

Add one block per condition:

```text
Condition:
- trigger_field_name: field_key
- trigger_value: exact value
- action: show | hide
- target_field_names: [field_key_1, field_key_2]
- condition_order: 1 (optional)
- match_type: all | any (optional, for grouped conditions)
```

## 5) Output formatting notes (optional)

- Any special way responses should be formatted in project description?
- Any fields that should always appear at the top?
- Any labels/wording you want adjusted for tone?
- If formatting notes are required, should implementation block rollout until formatting is wired? (`yes` / `no`)

## 6) SOP/task behavior

- Should this service instantiate SOPs/tasks from template on project creation? (`yes` / `no`)
- If yes, do SOP/task definitions already exist? (`yes` / `no`)

## 7) Rollout

- Apply to production now? (`yes` / `no`)
- Safe to overwrite existing intake fields for this service? (`yes` / `no`)
- Keep old fields and only append new ones? (`yes` / `no`)

## 8) Validation checklist

- Confirm `/projects` card links to `/projects/create` with the expected `templateId` (`yes` / `no`)
- Confirm intake fields render in `/projects/create` for this service (`yes` / `no`)
- Confirm `project_intake_responses` persists after project creation (`yes` / `no`)

---

## Quick Example (short)

```text
Service name: HubSpot Lead Routing Optimization
Category: Revenue Operations
Existing service template ID: unknown
New or update: new

Brief goal:
- Understand current routing setup, SLAs, and exceptions
- Filled by sales ops lead
- Target completion time: 5 minutes

Field:
- key: crm_state
- label: Current CRM state
- type: select
- required: true
- order: 1
- options: ["Clean", "Needs cleanup", "Major redesign needed"]

Field:
- key: routing_rules
- label: Describe your current routing rules
- type: textarea
- required: true
- order: 2
```
