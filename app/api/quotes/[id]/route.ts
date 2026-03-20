import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getWorkspaceBudgetSnapshot,
  quotePriceToCents,
} from '@/lib/billing/workspace-budget';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isQuoteManager } from '@/lib/auth/platform-role';
import { validateQuoteAssignee } from '@/lib/auth/quote-assignee';

// GET - Get single quote with line items
export async function GET(
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

    // Fetch quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isQuoteManager(platformRole) && quote.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', id)
      .order('order_index', { ascending: true });

    return NextResponse.json(
      {
        quote: {
          ...quote,
          line_items: lineItems || [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in quote API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update quote (PM review, pricing, customer approval)
export async function PATCH(
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

    const body = await request.json();

    // Fetch existing quote
    const { data: existingQuote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingQuote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);

    // Build update object based on permissions and status
    const updateData: any = {};

    // Only PM/admin can update PM-specific fields
    if (isQuoteManager(platformRole)) {
      if (body.final_price !== undefined) updateData.final_price = body.final_price;
      if (body.pm_notes !== undefined) updateData.pm_notes = body.pm_notes;
      if (body.assigned_lead_user_id !== undefined)
        updateData.assigned_lead_user_id = body.assigned_lead_user_id;

      // PM review
      if (body.status === 'pending_customer_approval' && existingQuote.status === 'pending_pm_review') {
        updateData.status = 'pending_customer_approval';
        updateData.reviewed_by_user_id = user.id;
        updateData.reviewed_at = new Date().toISOString();
      }
    }

    // Customer can approve or reject
    if (existingQuote.user_id === user.id) {
      if (body.status === 'approved' && existingQuote.status === 'pending_customer_approval') {
        const { data: customerWorkspace, error: wsLookupError } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', existingQuote.user_id)
          .maybeSingle();

        if (wsLookupError || !customerWorkspace) {
          return NextResponse.json(
            { error: 'Your workspace must be set up before you can approve quotes.' },
            { status: 400 }
          );
        }

        const quoteCents = quotePriceToCents(
          existingQuote.final_price,
          existingQuote.estimated_price
        );

        if (quoteCents > 0) {
          const budget = await getWorkspaceBudgetSnapshot(supabase, customerWorkspace.id);
          if (budget.availableCents < quoteCents) {
            return NextResponse.json(
              {
                error:
                  'Insufficient balance to accept this quote. Available budget is less than the quoted amount.',
              },
              { status: 400 }
            );
          }
        }

        updateData.status = 'approved';
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by_user_id = user.id;
        updateData.assignment_locked = true;
      }

      if (body.status === 'rejected' && existingQuote.status === 'pending_customer_approval') {
        updateData.status = 'rejected';
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = body.rejection_reason;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    if (
      updateData.assigned_lead_user_id !== undefined &&
      updateData.assigned_lead_user_id !== null
    ) {
      const assigneeValidation = await validateQuoteAssignee(
        updateData.assigned_lead_user_id
      );
      if (!assigneeValidation.ok) {
        return NextResponse.json(
          { error: assigneeValidation.reason || 'Invalid assignee' },
          { status: 400 }
        );
      }
    }

    // Update quote
    const { data: quote, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If approved, create project (workspace + committed cost)
    if (updateData.status === 'approved') {
      const { data: projectId, error: projectError } = await supabase.rpc(
        'create_project_from_quote',
        { quote_id_param: id }
      );

      if (projectError) {
        console.error('Error creating project from quote:', projectError);
        const { error: revertError } = await supabase
          .from('quotes')
          .update({
            status: 'pending_customer_approval',
            approved_at: null,
            approved_by_user_id: null,
            assignment_locked: false,
          })
          .eq('id', id);

        if (revertError) {
          console.error('Failed to revert quote after project creation error:', revertError);
        }

        return NextResponse.json(
          {
            error:
              projectError.message ||
              'Could not create the project from this quote. Your approval was rolled back — try again or contact support.',
          },
          { status: 500 }
        );
      }

      if (!projectId) {
        await supabase
          .from('quotes')
          .update({
            status: 'pending_customer_approval',
            approved_at: null,
            approved_by_user_id: null,
            assignment_locked: false,
          })
          .eq('id', id);

        return NextResponse.json(
          { error: 'Project was not created. Your approval was rolled back.' },
          { status: 500 }
        );
      }
    }

    // TODO: Send appropriate email notifications

    return NextResponse.json({ quote }, { status: 200 });
  } catch (error) {
    console.error('Error in quote API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete quote (only if pending)
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

    // Fetch quote
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Only allow deletion if pending
    if (quote.status !== 'pending_pm_review' && quote.status !== 'pending_customer_approval') {
      return NextResponse.json(
        { error: 'Cannot delete approved or rejected quotes' },
        { status: 400 }
      );
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    if (!isQuoteManager(platformRole) && quote.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase.from('quotes').delete().eq('id', id);

    if (error) {
      console.error('Error deleting quote:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in quote API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
