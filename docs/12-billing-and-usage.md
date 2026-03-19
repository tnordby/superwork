# Billing, Invoices, Budget, and Usage

## Purpose
Make money and usage transparent so customers understand what they are paying for and what has been delivered.

## Billing and invoices
- invoice list
- invoice status
- invoice detail access
- downloadable invoice PDF
- billing entity information

## Budget and usage
- current balance
- used vs available budget
- usage history
- grouping by project
- monthly summary views
- plain-language explanations

## Principles
- finance users should be able to self-serve
- usage should not feel like a black box
- subscription and usage should be clearly separated
- trust matters as much as polish in this area

## Prepaid balance: Stripe vs bank transfer

Today, **purchased balance** in the portal is largely derived from **Stripe** (paid subscription invoices). **Bank transfers, wires, and manual settlements do not appear automatically** unless something records them in the system.

When we build **admin** (and finance) tooling, assume **manual steps** for off-Stripe money:

1. **Credit the right workspace** — tie every manual credit to a specific `workspace_id` / customer org; never “global” balance.
2. **Auditable ledger** — who added the credit, when, amount, currency, reference (invoice #, PO, bank ref), and optional note. Prefer append-only or clearly versioned entries over silently editing a single balance field.
3. **Portal parity** — `getWorkspaceBudgetSnapshot` / customer-facing “purchased balance” must **include** manual credits the same way as Stripe-derived totals (single source of truth for “available to commit”).
4. **Quote approval** — the **insufficient balance** check runs against that same total; bank-only customers must not be blocked because Stripe is empty while cash was received offline.
5. **Reconciliation** — admin view to match bank deposits / accounting exports to applied credits (even a simple list + filters is enough for v1).

**Product implication:** admin features around billing are not optional polish for bank customers—they are how prepaid balance becomes real in the product. Design admin flows with **least privilege**, **tenant boundaries**, and **no customer-visible internal notes** unless explicitly intended.
