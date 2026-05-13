# Authentication and Permissions

## Authentication
- Supabase Auth
- email and password login
- password reset by email
- persistent sessions
- secure logout

## Signup flows

### Self-service customer signup
- creates auth user
- creates customer organization
- creates membership with admin role
- redirects into the app after signup (e.g. dashboard)

### Admin-created customer account
- admin creates organization
- admin invites initial customer user
- invited user joins existing organization

### Customer invites colleague
- only customer admins can invite
- invite joins existing organization
- invite assigns admin, member, or viewer role

### Provider and admin creation
- internal only
- no public self-registration

## Access principles
- never trust client-only role checks
- scope data by organization membership
- customers never see other organizations
- providers only see scoped organizations or projects
- admins can access platform-level tools

## Route expectations
- /portal/* = authenticated
- customer areas = scoped to membership
- internal areas = provider and admin only
- admin areas = admin only

## Environment and onboarding

- Customer onboarding (HubSpot access, surveys, etc.) is **not** implemented inside this app; handle it with your external process or tooling.
- There are **no** `ONBOARDING_*` environment variables for an in-app checklist. Remove them from **Vercel / hosting / CI** project settings if they are still set from the old checklist.
- Copy **`.env.example`** to `.env.local` for local development (see repository root).
- Database migrations: apply **`050_drop_user_onboarding_progress.sql`** (removes checklist table) and **`051_intake_form_conditions_order_index.sql`** (stable ordering for intake rules) when deploying.
- **Playwright:** `e2e/intake-form.spec.ts` smoke-tests that unauthenticated users are sent to login when opening project creation with a template.

## API hardening (intake and related)

- **UUID path/query params:** `GET /api/services/[id]/intake-form`, `GET`/`POST` `/api/projects/[id]/intake-response` reject malformed ids with **400** (not a DB round-trip).
- **POST intake body:** Parsed via **`readJsonWithLimit`** (default **512 KB** cap); invalid JSON → **400**, oversized → **413**.
- **Template consistency:** If **`projects.service_template_id`** is set, intake **`serviceTemplateId`** must match or the API returns **409**.
- **Sanitization:** Intake responses are capped by **key count** and **string length** before persistence (see `lib/intake/sanitize-intake-responses.ts`).

### Further recommendations (not all implemented in code)

- **Rate limiting:** Add per-IP or per-user limits on `POST .../intake-response` (e.g. Upstash Redis, Vercel KV, or edge middleware) to blunt abuse.
- **CSRF:** For cookie-based sessions, ensure mutations only accept same-site requests or use CSRF tokens if you add cross-site flows.
- **Audit log:** Append-only table or log stream for who changed intake data (user id, project id, timestamp) for support and compliance.
- **Idempotency:** For retries from the client, optional `Idempotency-Key` header deduping writes.
- **WAF / bot:** Cloudflare or similar in front of production for volumetric and scripted traffic.
