import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    .select('email_notify_inbox_messages')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const raw = profile?.email_notify_inbox_messages;
  const emailNotifyInboxMessages = raw !== false;

  return NextResponse.json({ emailNotifyInboxMessages });
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

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as { emailNotifyInboxMessages?: unknown }).emailNotifyInboxMessages !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'Expected { emailNotifyInboxMessages: boolean }' },
      { status: 400 }
    );
  }

  const emailNotifyInboxMessages = (body as { emailNotifyInboxMessages: boolean })
    .emailNotifyInboxMessages;

  const { error } = await supabase
    .from('profiles')
    .update({ email_notify_inbox_messages: emailNotifyInboxMessages })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ emailNotifyInboxMessages });
}
