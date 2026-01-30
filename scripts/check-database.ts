import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkDatabase() {
  console.log('🔍 Checking database tables...\n');

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

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: NOT FOUND or ERROR`);
        console.log(`   Error: ${error.message}\n`);
      } else {
        console.log(`✅ ${table}: EXISTS (${data?.length || 0} rows checked)\n`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ERROR`);
      console.log(`   ${err}\n`);
    }
  }

  console.log('\n📊 Database Check Complete');
}

checkDatabase();
