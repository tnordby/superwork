import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_NAME_LEN = 120;

function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim().slice(0, MAX_NAME_LEN);
  return t.length > 0 ? t : null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const firstName = typeof profile?.first_name === 'string' ? profile.first_name.trim() : '';
  const lastName = typeof profile?.last_name === 'string' ? profile.last_name.trim() : '';

  return NextResponse.json({
    email: user.email ?? '',
    firstName,
    lastName,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const raw = body as { firstName?: unknown; lastName?: unknown };
  if (typeof raw.firstName !== 'string' || typeof raw.lastName !== 'string') {
    return NextResponse.json(
      { error: 'Expected { firstName: string, lastName: string }' },
      { status: 400 }
    );
  }

  const firstName = normalizeName(raw.firstName);
  const lastName = normalizeName(raw.lastName);

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    email: user.email ?? '',
    firstName: firstName ?? '',
    lastName: lastName ?? '',
  });
}
