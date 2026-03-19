# Core Data Model

## Organizations
Represents a customer company or Superwork itself.

Key fields:
- id
- name
- type
- domain
- website_url
- country
- created_at

## Users
Represents an authenticated person.

Key fields:
- id
- email
- name
- user_type
- created_at
- last_login_at

## Organization Memberships
Defines tenant boundaries and access.

Key fields:
- id
- user_id
- organization_id
- role
- created_at

## Projects
Represents consulting work.

Key fields:
- id
- organization_id
- title
- status
- progress_percentage
- created_at
- updated_at

## Project Assignments
Maps providers to projects.

Key fields:
- id
- project_id
- user_id
- role
- created_at

## Messages
Contextual communication tied to projects.

Key fields:
- id
- project_id
- author_user_id
- message_body
- is_internal
- created_at

## Assets
Metadata for files stored in Supabase Storage.

Key fields:
- id
- project_id
- uploaded_by_user_id
- file_name
- file_type
- storage_path
- is_final
- created_at

## Invoices
Read-only financial records visible in the portal.

Key fields:
- id
- organization_id
- invoice_number
- amount
- currency
- status
- issued_at
- due_at
- pdf_url

## Additional recommended entities
- usage_records
- activity_events
- invitations
- audit_logs
