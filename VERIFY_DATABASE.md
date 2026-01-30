# Database Verification Guide

Use this guide to verify all database tables have been created correctly in Supabase.

## Quick Verification Steps

### Method 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your "Superwork Portal" project
3. Click **Table Editor** in the left sidebar
4. Check that you see ALL of these tables:

#### Required Tables (from full-schema.sql):
- ✅ **profiles** - User profile information
- ✅ **projects** - Customer projects
- ✅ **conversations** - Chat conversations
- ✅ **messages** - Individual chat messages
- ✅ **assets** - Uploaded files
- ✅ **invoices** - Billing invoices
- ✅ **team_members** - Team collaboration
- ✅ **account_usage** - Usage tracking

#### Required Table (from email-logs-schema.sql):
- ✅ **email_logs** - Email sending logs

**Total Expected Tables: 9**

---

### Method 2: SQL Query

1. Go to Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Paste and run this:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

4. You should see these 9 tables in the results:
   - account_usage
   - assets
   - conversations
   - email_logs
   - invoices
   - messages
   - profiles
   - projects
   - team_members

---

### Method 3: Check Row Level Security

To verify RLS is enabled on all tables:

```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

---

## If Tables Are Missing

### Missing: All 8 main tables (profiles, projects, etc.)
**Run:** `supabase/full-schema.sql` in SQL Editor

### Missing: email_logs table only
**Run:** `supabase/email-logs-schema.sql` in SQL Editor

### How to Run SQL Files

1. Open the SQL file in your code editor
2. **Copy the entire file contents** (Cmd+A, Cmd+C)
3. Go to Supabase Dashboard → **SQL Editor**
4. Click **New Query**
5. **Paste** the SQL (Cmd+V)
6. Click **Run** (or press Cmd+Enter)
7. Wait for "Success. No rows returned" message

---

## Test Profile Auto-Creation

To verify profiles are auto-created on signup:

1. Sign up with a new account at http://localhost:3001/signup
2. Go to Supabase → Table Editor → **profiles**
3. You should see a new row with your user data

---

## Current Status Check

Based on what you've told me, you believe you've run all schemas. Let's confirm:

### ✅ You Should Have:
- 9 total tables in Supabase
- RLS enabled on all tables
- Auto-creation trigger for profiles
- Email logging capability

### 🔍 To Confirm:
1. Open Supabase Table Editor
2. Count the tables
3. If you see all 9 tables listed above → **You're all set! ✅**
4. If any are missing → Run the corresponding SQL file

---

## Next Steps After Verification

Once confirmed, you're ready to:
1. ✅ Test signup with a real email (should receive welcome email)
2. ✅ Start building features (Projects, Inbox, etc.)
3. ✅ Connect the UI to real database data
