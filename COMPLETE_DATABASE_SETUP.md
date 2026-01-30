# Complete Database Setup Guide

This guide will help you set up all the necessary tables for the Superwork customer portal.

## What This Will Create

Running the full schema will create **8 tables** with complete functionality:

### 1. **profiles**
- Extended user information (name, company, avatar, phone)
- Auto-created when user signs up
- RLS enabled (users can only see their own profile)

### 2. **projects**
- Customer projects and service requests
- Tracks status, progress, assignee, dates
- Categories: HubSpot Services, Revenue Operations, Technical Services, AI & Data Services
- RLS enabled (users can only see their own projects)

### 3. **conversations**
- Chat conversation threads
- Linked to projects
- Tracks unread count, last message
- RLS enabled (users can only see their own conversations)

### 4. **messages**
- Individual chat messages
- Linked to conversations
- Tracks sender, content, timestamp, read status
- RLS enabled (users can only view messages in their conversations)

### 5. **assets**
- Uploaded files and documents
- Tracks file type, size, storage path
- Can be linked to projects
- RLS enabled (users can only see their own files)

### 6. **invoices**
- Billing invoices
- Tracks amount, status, due date, payment
- RLS enabled (users can only see their own invoices)

### 7. **team_members**
- Collaborate with team members
- Role-based access (admin, member, viewer)
- RLS enabled (users can only see their team)

### 8. **account_usage**
- Monthly usage and balance tracking
- Starting balance, used, in-progress, available
- RLS enabled (users can only see their own usage)

## How to Run the Schema

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your **Superwork Portal** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Full Schema

1. Open `supabase/full-schema.sql` in your code editor
2. **Copy the entire file contents**
3. **Paste into the SQL Editor**
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Wait for execution to complete (should take 5-10 seconds)

You should see: ✅ **Success. No rows returned**

### Step 3: Verify the Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should see all 8 tables:
   - profiles
   - projects
   - conversations
   - messages
   - assets
   - invoices
   - team_members
   - account_usage

### Step 4: Check Row Level Security

1. Click on any table in Table Editor
2. Click the **Policies** tab
3. You should see RLS policies listed (e.g., "Users can view own profile")

## Testing the Setup

### Test Profile Creation

1. Go to http://localhost:3000/signup
2. Create a test account:
   - First name: Test
   - Last name: User
   - Email: test@example.com
   - Password: testpass123

3. After signup, go to Supabase > Table Editor > **profiles**
4. You should see a new row with your test user's data

### Test Projects Table (Manual)

Run this in SQL Editor to create a test project:

```sql
INSERT INTO public.projects (user_id, name, description, category, service_type, status, progress, assignee)
SELECT
  auth.uid(),
  'Test Project',
  'HubSpot CRM Implementation',
  'HubSpot Services',
  'CRM implementation',
  'in_progress',
  45,
  'Sarah Mitchell'
WHERE auth.uid() IS NOT NULL;
```

Then check Table Editor > projects to see the new project.

## What's Protected by RLS?

All tables have Row Level Security (RLS) enabled. This means:

✅ Users can ONLY see their own data
✅ Users cannot read other users' profiles
✅ Users cannot see other users' projects, messages, invoices, etc.
✅ Database-level security (not just app-level)

## Table Relationships

```
auth.users (Supabase built-in)
  ↓
profiles (extended user info)
  ↓
projects (customer projects)
  ↓
conversations (chat threads)
  ↓
messages (individual chat messages)

projects
  ↓
assets (files linked to projects)

auth.users
  ↓
invoices (billing)
  ↓
account_usage (monthly usage tracking)

auth.users
  ↓
team_members (collaboration)
```

## Indexes for Performance

The schema includes indexes on frequently queried columns:

- User IDs (for quick lookup of user's data)
- Created dates (for sorting/pagination)
- Status fields (for filtering)
- Foreign keys (for joins)

## Automatic Timestamps

Tables automatically track:
- `created_at` - When the row was created
- `updated_at` - When the row was last modified (auto-updated)

## Next Steps

After running the schema:

1. ✅ **Test authentication** - Signup and login work
2. ✅ **Profile auto-creation** - Profile created on signup
3. 📝 **Update UI to use real data** - Connect pages to database
4. 📝 **Implement project creation** - Let users create projects
5. 📝 **Build inbox with real messages** - Connect conversations/messages
6. 📝 **Add file upload to assets** - Use Supabase Storage
7. 📝 **Implement real-time** - Enable live updates for messages

## Troubleshooting

### Error: "relation already exists"
The table already exists. Either:
- Skip running the schema again, OR
- Drop tables first:
  ```sql
  DROP TABLE IF EXISTS public.team_members CASCADE;
  DROP TABLE IF EXISTS public.account_usage CASCADE;
  DROP TABLE IF EXISTS public.invoices CASCADE;
  DROP TABLE IF EXISTS public.assets CASCADE;
  DROP TABLE IF EXISTS public.messages CASCADE;
  DROP TABLE IF EXISTS public.conversations CASCADE;
  DROP TABLE IF EXISTS public.projects CASCADE;
  DROP TABLE IF EXISTS public.profiles CASCADE;
  ```
  Then run the full schema again.

### Error: "permission denied"
- Make sure you're logged in to Supabase
- Check you have owner/admin access to the project

### Tables created but no data
- That's normal! Tables are empty until you:
  - Sign up (creates profile)
  - Create projects via the app
  - Upload files, etc.

## Schema Diagram

```
┌─────────────┐
│ auth.users  │ (Supabase built-in)
└──────┬──────┘
       │
       ├─────► profiles (1:1)
       │
       ├─────► projects (1:many)
       │         └──► conversations (1:many)
       │               └──► messages (1:many)
       │         └──► assets (1:many)
       │
       ├─────► invoices (1:many)
       │
       ├─────► account_usage (1:many)
       │
       └─────► team_members (1:many)
```

## You're All Set!

Once you've run the schema, your database is fully configured and ready to power the Superwork customer portal! 🎉

The next phase is connecting the UI to these tables so users can:
- View and manage their projects
- Chat with consultants
- Upload and download files
- View invoices and usage
- Invite team members
