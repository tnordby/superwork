import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff, isQuoteManager } from '@/lib/auth/platform-role';
import { validateQuoteAssignee } from '@/lib/auth/quote-assignee';
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context';
import { notifyQuoteAssignee } from '@/lib/quotes/quote-email-notify';

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

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isQuoteManager(platformRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
    if (isInternalStaff(platformRole) && !selectedWorkspaceId) {
      return NextResponse.json(
        { error: 'Select a client context before assigning quote consultants.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const assigneeValidation = await validateQuoteAssignee(body.user_id);
    if (!assigneeValidation.ok) {
      return NextResponse.json(
        { error: assigneeValidation.reason || 'Invalid assignee' },
        { status: 400 }
      );
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

    if (isInternalStaff(platformRole) && selectedWorkspaceId) {
      const { data: project } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', quote.project_id)
        .maybeSingle();
      if (!project || project.workspace_id !== selectedWorkspaceId) {
        return NextResponse.json({ error: 'Quote is outside selected client context' }, { status: 403 });
      }
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

    if (updatedQuote?.id && body.user_id) {
      void notifyQuoteAssignee({
        quoteId: updatedQuote.id,
        quoteTitle:
          typeof updatedQuote.title === 'string' ? updatedQuote.title : 'Quote',
        assigneeUserId: body.user_id,
      });
    }

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

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isQuoteManager(platformRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
    if (isInternalStaff(platformRole) && !selectedWorkspaceId) {
      return NextResponse.json(
        { error: 'Select a client context before removing quote assignment.' },
        { status: 400 }
      );
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

    if (isInternalStaff(platformRole) && selectedWorkspaceId) {
      const { data: project } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', quote.project_id)
        .maybeSingle();
      if (!project || project.workspace_id !== selectedWorkspaceId) {
        return NextResponse.json({ error: 'Quote is outside selected client context' }, { status: 403 });
      }
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
