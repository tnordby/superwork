# Supabase Setup Instructions

This document guides you through setting up Supabase for the Superwork customer portal.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create an account)
2. Click "New Project"
3. Fill in the project details:
   - **Name**: Superwork Portal
   - **Database Password**: Choose a strong password (save it somewhere safe)
   - **Region**: Choose the region closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (this takes 1-2 minutes)

## Step 2: Get Your API Keys

1. Once your project is ready, click on "Settings" in the left sidebar
2. Click on "API" under Settings
3. Copy the following values:
   - **Project URL** (under Project Configuration)
   - **anon public** key (under Project API keys)

## Step 3: Update Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Enable Email Authentication

1. In your Supabase dashboard, go to "Authentication" in the left sidebar
2. Click on "Providers" tab
3. Make sure "Email" is enabled (it should be enabled by default)
4. Configure email templates if needed (Authentication > Email Templates)

## Step 5: Create Database Tables (Optional for now)

The authentication will work out of the box with Supabase's built-in auth.users table. When you're ready to add more features, you can create additional tables:

```sql
-- Create a profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  email text,
  first_name text,
  last_name text,
  company_name text,
  avatar_url text
);

-- Enable RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Create policy to allow users to read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

-- Create policy to allow users to update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Create a trigger to automatically create a profile when a user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Step 6: Test the Authentication

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3002/signup`
3. Create a new account with your email and password
4. You should be automatically logged in and redirected to the home page
5. Try logging out and logging back in

## Step 7: Configure Email Settings (Optional)

By default, Supabase uses their SMTP server for sending emails, but you can configure your own:

1. Go to "Authentication" > "Email Templates" in Supabase dashboard
2. Customize the email templates for:
   - Confirm signup
   - Magic Link
   - Reset password
3. To use your own SMTP server:
   - Go to "Settings" > "Auth"
   - Scroll down to "SMTP Settings"
   - Enter your SMTP credentials

## Troubleshooting

### "Invalid API key" error
- Make sure you copied the correct anon public key (not the service role key)
- Ensure there are no extra spaces in your .env.local file

### Email confirmation not working
- Check your spam folder
- In development, you can disable email confirmation:
  - Go to "Authentication" > "Providers" in Supabase
  - Disable "Confirm email" under Email provider settings

### Redirect not working after login
- Make sure your middleware.ts is properly configured
- Check browser console for any errors
- Verify the NEXT_PUBLIC_SUPABASE_URL is correct

## Next Steps

Now that authentication is set up, you can:

1. **Create Database Schema**: Set up tables for projects, messages, assets, etc.
2. **Add Real-time Features**: Use Supabase's real-time subscriptions for the inbox
3. **File Storage**: Set up Supabase Storage for the assets page
4. **Row Level Security**: Add policies to protect your data

## Useful Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
