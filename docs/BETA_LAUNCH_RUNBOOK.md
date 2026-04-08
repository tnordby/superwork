# Beta Launch Runbook

## Objective
Ship a safe, supportable beta for customer and internal teams.

## 1) Pre-Deploy Checks

- Confirm latest commits are on `main`.
- Confirm DB migrations are fully applied in production.
- Confirm environment variables are set:
  - Supabase URL/keys
  - Stripe secret, publishable key, webhook secret
  - App URL
  - Sentry DSN

## 2) Auth Smoke Test

- Signup with fresh email.
- Confirm login works.
- Confirm invalid password shows user-friendly error.
- Confirm password reset flow works.

## 3) Tenant Safety Smoke Test

Using one PM/admin account and two client workspaces:

- Set client context to Client A.
- Verify only Client A data appears in:
  - Team Quotes
  - Inbox
  - Assets
  - Projects
  - Customers detail/contracts
- Attempt write actions under Client A:
  - Create project
  - Create quote from project
  - Send message
  - Upload asset
- Switch to Client B and verify all read data changes.
- Try direct action on Client A object while Client B selected: must be blocked.
- Switch to All clients and verify internal writes require context where enforced.

## 4) Billing + Stripe Verification

- Complete a test checkout session.
- Verify webhook events update workspace subscription fields.
- Verify failed payment event marks workspace as `past_due`.

## 5) Observability

- Trigger a controlled test error in staging/production.
- Confirm it appears in Sentry.
- Confirm webhook failures are visible in logs.

## 6) Support Readiness

- Verify legal pages are reachable:
  - `/terms`
  - `/privacy`
- Verify support inbox/process owner for beta feedback.
- Prepare rollback note:
  - latest DB backup timestamp
  - previous deploy SHA

## 7) Go/No-Go

Go only if:

- No cross-tenant leakage in smoke tests.
- No blocking auth or billing issue.
- Error monitoring is live.
- On-call owner is assigned for launch window.
