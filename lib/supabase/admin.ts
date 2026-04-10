import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function serviceRoleEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Service role client when env is set; otherwise null (e.g. local dev missing .env).
 * Prefer this for routes that can return a clear config error instead of throwing.
 */
export function tryCreateServiceRoleClient(): SupabaseClient | null {
  const env = serviceRoleEnv();
  if (!env) return null;
  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server-only Supabase client with the service role. Never import from client components.
 */
export function createServiceRoleClient(): SupabaseClient {
  const env = serviceRoleEnv();
  if (!env) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
