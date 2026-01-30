import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST - Assign consultant to quote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only PM/admin can assign
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin' && userRole !== 'pm') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Fetch quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Check if assignment is locked
    if (quote.assignment_locked) {
      return NextResponse.json(
        { error: 'Assignment is locked. Quote has been approved.' },
        { status: 400 }
      );
    }

    // Update quote with assigned lead
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({
        assigned_lead_user_id: body.user_id,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error assigning consultant:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // TODO: Send notification to assigned consultant

    return NextResponse.json({ quote: updatedQuote }, { status: 200 });
  } catch (error) {
    console.error('Error in assignment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only PM/admin can remove assignment
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin' && userRole !== 'pm') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Check if assignment is locked
    if (quote.assignment_locked) {
      return NextResponse.json(
        { error: 'Assignment is locked. Quote has been approved.' },
        { status: 400 }
      );
    }

    // Remove assignment
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({
        assigned_lead_user_id: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error removing assignment:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ quote: updatedQuote }, { status: 200 });
  } catch (error) {
    console.error('Error in assignment API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
