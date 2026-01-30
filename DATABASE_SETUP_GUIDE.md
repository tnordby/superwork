# Database Setup Guide

Follow these steps to set up your Supabase database schema.

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your **Superwork Portal** project
3. Click on **SQL Editor** in the left sidebar (database icon)
4. Click **New Query** button

## Step 2: Run the Schema

1. Open the file `supabase/schema.sql` in your code editor
2. **Copy the entire contents** of the file
3. **Paste it into the SQL Editor** in Supabase
4. Click the **Run** button (or press Cmd/Ctrl + Enter)

## Step 3: Verify the Setup

After running the SQL, you should see a success message. Verify everything was created:

### Check the Profiles Table:
1. In Supabase, go to **Table Editor** in the left sidebar
2. You should see a new table called **profiles**
3. Click on it to see the columns:
   - `id` (uuid, primary key)
   - `email` (text)
   - `first_name` (text)
   - `last_name` (text)
   - `company_name` (text)
   - `avatar_url` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

### Check RLS Policies:
1. Click on **Authentication** > **Policies** in the left sidebar
2. Select the **profiles** table
3. You should see 3 policies:
   - "Users can view own profile"
   - "Users can update own profile"
   - "Users can insert own profile"

### Check the Trigger:
1. Go back to **SQL Editor**
2. Run this query to verify the trigger:
   ```sql
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE trigger_name = 'on_auth_user_created';
   ```
3. You should see the trigger is active

## Step 4: Test Profile Creation

1. Go to your app: http://localhost:3000/signup
2. Create a new test account:
   - First name: Test
   - Last name: User
   - Email: test@example.com
   - Password: test123456

3. After signup, verify the profile was created:
   - Go to Supabase **Table Editor** > **profiles**
   - You should see a new row with your test user's information
   - The `first_name` and `last_name` should be populated from signup

## Step 5: Clean Up (Optional)

If you want to delete the test user:

1. Go to **Authentication** > **Users** in Supabase
2. Find your test user
3. Click the three dots and select **Delete user**
4. The profile will be automatically deleted (cascade delete)

## What Was Created?

### 1. Profiles Table
- Stores extended user information beyond what's in `auth.users`
- Linked to `auth.users` via foreign key
- Has Row Level Security enabled

### 2. Automatic Profile Creation
- Trigger function `handle_new_user()` runs when a user signs up
- Automatically creates a profile row with data from signup form
- No manual intervention needed

### 3. Security Policies
- Users can only view/edit their own profile
- Other users' profiles are hidden
- Enforced at the database level

## Troubleshooting

### Error: "relation already exists"
- The table already exists. You can either:
  - Drop the table first: `DROP TABLE IF EXISTS public.profiles CASCADE;`
  - Or skip running the schema again

### Error: "permission denied"
- Make sure you're logged in to the correct Supabase project
- Check that you have owner/admin access to the project

### Trigger not firing
- Check if the trigger exists: See verification query above
- Try creating a new user to test
- Check Supabase logs: Dashboard > Logs > Database

### Profile not created on signup
- Verify the trigger is active
- Check if user metadata is being passed correctly in signup
- Look at Supabase logs for errors

## Next Steps

Once the profiles table is working, you can extend the schema with:

1. **Projects table** - Store customer projects
2. **Messages table** - Chat messages for inbox
3. **Assets table** - File metadata for uploaded assets
4. **Organizations table** - Multi-tenant support
5. **Project members table** - Collaboration features

Would you like me to create these additional tables?
