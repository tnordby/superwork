# Assets and Deliverables

## Purpose
Centralize uploaded assets and delivered work in one place.

## Scope
- upload brand assets and reference materials
- upload deliverables tied to projects
- view file metadata
- preview or download files where supported
- indicate draft vs final when exposed

## Principles
- no file chaos
- files should be easy to locate by project
- customer-supplied and consultant-supplied files should be distinguishable
- storage metadata must be tracked reliably

## Storage notes
- use Supabase Storage
- persist metadata in assets table
- protect access through organization and role-aware logic
