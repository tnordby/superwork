# Production smoke checklist

Run after deploys or database/storage policy changes (especially migrations **040**, **041**, and **042** for `email_logs` inserts). Use a **customer** account and an **internal** (consultant/PM) account with a **selected client** in the sidebar.

## Auth and shell

- [ ] Sign in as customer; home and sidebar load without errors.
- [ ] Sign in as internal; client switcher works; selecting a client scopes team quotes/projects as expected.

## Assets (`shared-assets` + RLS)

**Customer**

- [ ] Open **Assets**; list loads for the selected workspace.
- [ ] Upload a small image; it appears in the list.
- [ ] Hover or open preview; image preview loads (signed URL).
- [ ] Download works.
- [ ] Delete your upload (if you have permission).

**Internal**

- [ ] With a client selected, open **Assets** for that client; list and preview/download work for client files you should see after **040**.

## Projects and teams

- [ ] Customer: **Account → Teams** loads; creating or editing a team behaves as expected.
- [ ] Internal: open a **project** in the selected client context; **Team** dropdown lists workspace teams and saves.
- [ ] Create project (or custom brief) with optional **team** when internal; project has correct `team_id` in UI/API.

## Quotes and budget

- [ ] Customer: open a pending quote; **Approve** succeeds when balance is sufficient; a **project** exists afterward (`create_project_from_quote`).
- [ ] Approve with insufficient balance shows the expected error and does not leave the quote stuck in a bad state.

## Inbox

- [ ] Send a message as customer; assignee/customer receives at most one notification per send; rapid duplicate sends of the **same text** do not spam email (dedup).
- [ ] Send two **different** messages in a row; both sides still get notified as expected.

## Billing (if Stripe is live)

- [ ] **Account → Plan** / balance views load; “Manage billing” opens Stripe when configured.

## Automated checks (local/CI)

Run before manual smoke (or in CI):

```bash
npm run smoke:local
```

Same as `npm test` plus `npx tsc --noEmit`.

---

Adjust steps to match your environments (staging vs production URLs and test accounts).
