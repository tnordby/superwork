# Tech Stack

## Core stack
- Next.js
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Storage

## Why this stack
- fast iteration for product and portal work
- strong fit for auth, database, and storage in one system
- straightforward multi-tenant foundations
- reasonable support for real-time messaging if needed later

## Architecture notes
- server-side access control remains mandatory
- row-level security is part of the design, not an afterthought
- storage metadata should be tracked in database tables
- authentication identity and user profile data are separate concerns
