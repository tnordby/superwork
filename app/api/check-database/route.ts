import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const tables = [
    'profiles',
    'projects',
    'conversations',
    'messages',
    'assets',
    'invoices',
    'team_members',
    'account_usage',
    'email_logs',
  ];

  const results: Record<string, { exists: boolean; error?: string; rowCount?: number }> = {};

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results[table] = { exists: false, error: error.message };
      } else {
        results[table] = { exists: true, rowCount: count || 0 };
      }
    } catch (err: any) {
      results[table] = { exists: false, error: err.message };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
