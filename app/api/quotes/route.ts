import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isQuoteManager } from '@/lib/auth/platform-role';

// GET - List quotes (filtered by role)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);

    let query = supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isQuoteManager(platformRole)) {
      query = query.eq('user_id', user.id);
    }

    const { data: quotes, error } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quotes }, { status: 200 });
  } catch (error) {
    console.error('Error in quotes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new quote request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.category || !body.service_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, service_type' },
        { status: 400 }
      );
    }

    // Create quote
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description,
        category: body.category,
        service_type: body.service_type,
        estimated_price: body.estimated_price,
        currency: body.currency || 'USD',
        status: 'pending_pm_review',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quote:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Send notification to PM about new quote request

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    console.error('Error in quotes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
