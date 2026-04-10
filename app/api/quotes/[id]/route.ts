import { NextRequest, NextResponse } from 'next/server';
import type { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  getWorkspaceBudgetSnapshot,
  quotePriceToCents,
} from '@/lib/billing/workspace-budget';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isQuoteManager } from '@/lib/auth/platform-role';
import { validateQuoteAssignee } from '@/lib/auth/quote-assignee';
import { computeValuePricing, roundUpToNearestThousand } from '@/lib/quotes/value-pricing';
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context';
import { resolveCustomerWorkspaceContext } from '@/lib/account/customer-workspace-context';

const QUOTE_OPTIONAL_PRICING_COLUMNS = new Set([
  'estimated_hours_low',
  'estimated_hours_high',
  'pass_through_costs',
  'certainty_buffer_percent',
  'certainty_premium',
  'value_anchor_price',
  'value_confidence_score',
  'pricing_rationale',
]);

const QUOTE_FIELDS_HIDDEN_FROM_CUSTOMER = [
  'adjusted_hours',
  'estimated_hours_low',
  'estimated_hours_high',
  'internal_hourly_rate',
  'pass_through_costs',
  'desired_margin_percent',
  'certainty_buffer_percent',
  'certainty_premium',
  'value_adjustment',
  'value_anchor_price',
  'value_confidence_score',
  'pricing_rationale',
  'floor_price',
] as const;

function extractMissingQuotesColumn(errorMessage: string | undefined): string | null {
  if (!errorMessage) return null;
  const match = errorMessage.match(/Could not find the '([^']+)' column of 'quotes'/i);
  return match?.[1] ?? null;
}

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
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
    if (!isQuoteManager(platformRole) && quote.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (isQuoteManager(platformRole) && selectedWorkspaceId) {
      const { data: quoteProject } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', quote.project_id)
        .maybeSingle();
      if (!quoteProject || quoteProject.workspace_id !== selectedWorkspaceId) {
        return NextResponse.json({ error: 'Quote is outside selected client context' }, { status: 403 });
      }
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', id)
      .order('order_index', { ascending: true });

    const { data: milestones } = await supabase
      .from('quote_milestones')
      .select('*')
      .eq('quote_id', id)
      .order('order_index', { ascending: true });

    let quoteMilestones = milestones || [];
    if (quoteMilestones.length === 0 && quote.project_id) {
      const { data: projectMilestones } = await supabase
        .from('project_milestones')
        .select('title, description, order_index')
        .eq('project_id', quote.project_id)
        .order('order_index', { ascending: true });
      quoteMilestones = (projectMilestones || []).map((m, idx) => ({
        id: `project-${idx}`,
        quote_id: id,
        title: m.title,
        description: m.description,
        estimated_hours: null,
        order_index: m.order_index ?? idx,
      }));
    }

    const quoteResponse: Record<string, unknown> = {
      ...(quote as unknown as Record<string, unknown>),
    };

    if (
      quote.project_id &&
      (!quote.client_first_name ||
        !quote.client_last_name ||
        !quote.client_email ||
        !quote.client_company_name)
    ) {
      const { data: projectOwner } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', quote.project_id)
        .maybeSingle();
      if (projectOwner?.user_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, company_name')
          .eq('id', projectOwner.user_id)
          .maybeSingle();
        quoteResponse['client_first_name'] =
          quote.client_first_name || ownerProfile?.first_name || null;
        quoteResponse['client_last_name'] =
          quote.client_last_name || ownerProfile?.last_name || null;
        quoteResponse['client_email'] = quote.client_email || ownerProfile?.email || null;
        quoteResponse['client_company_name'] =
          quote.client_company_name || ownerProfile?.company_name || null;
      }
    }

    // PM/internal helper: pull baseline hours from matching service template.
    if (isQuoteManager(platformRole)) {
      const { data: templateMatch } = await supabase
        .from('service_templates')
        .select('estimated_hours')
        .eq('name', quote.service_type)
        .maybeSingle();
      quoteResponse['baseline_hours'] = templateMatch?.estimated_hours ?? null;
    }

    if (!isQuoteManager(platformRole)) {
      for (const key of QUOTE_FIELDS_HIDDEN_FROM_CUSTOMER) {
        delete quoteResponse[key];
      }
      quoteMilestones = quoteMilestones.map((m) => ({
        ...(m as Record<string, unknown>),
        estimated_hours: null,
      }));
    }

    return NextResponse.json(
      {
        quote: {
          ...quoteResponse,
          line_items: lineItems || [],
          milestones: quoteMilestones,
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
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
    if (isQuoteManager(platformRole) && !selectedWorkspaceId) {
      return NextResponse.json(
        { error: 'Select a client context before updating quotes.' },
        { status: 400 }
      );
    }
    if (isQuoteManager(platformRole) && selectedWorkspaceId) {
      const { data: quoteProject } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', existingQuote.project_id)
        .maybeSingle();
      if (!quoteProject || quoteProject.workspace_id !== selectedWorkspaceId) {
        return NextResponse.json({ error: 'Quote is outside selected client context' }, { status: 403 });
      }
    }

    // Build update object based on permissions and status
    const updateData: Record<string, unknown> = {};

    // Only PM/admin can update PM-specific fields
    if (isQuoteManager(platformRole)) {
      if (body.final_price !== undefined) updateData.final_price = body.final_price;
      if (body.pm_notes !== undefined) updateData.pm_notes = body.pm_notes;
      if (body.assigned_lead_user_id !== undefined)
        updateData.assigned_lead_user_id = body.assigned_lead_user_id;
      if (body.pricing_rationale !== undefined)
        updateData.pricing_rationale = body.pricing_rationale || null;
      if (body.client_info) {
        if (body.client_info.first_name !== undefined)
          updateData.client_first_name = body.client_info.first_name || null;
        if (body.client_info.last_name !== undefined)
          updateData.client_last_name = body.client_info.last_name || null;
        if (body.client_info.email !== undefined)
          updateData.client_email = body.client_info.email || null;
        if (body.client_info.company_name !== undefined)
          updateData.client_company_name = body.client_info.company_name || null;
      }
      if (body.value_pricing) {
        const vp = body.value_pricing;
        const pricing = computeValuePricing({
          adjustedHours: Number(vp.adjusted_hours || 0),
          estimatedHoursLow: Number(vp.estimated_hours_low || 0),
          estimatedHoursHigh: Number(vp.estimated_hours_high || 0),
          internalHourlyRate: Number(vp.internal_hourly_rate || 0),
          passThroughCosts: Number(vp.pass_through_costs || 0),
          desiredMarginPercent: Number(vp.desired_margin_percent || 0),
          certaintyBufferPercent: Number(vp.certainty_buffer_percent || 0),
          valueAdjustment: Number(vp.value_adjustment || 0),
          valueAnchorPrice: Number(vp.value_anchor_price || 0),
          valueConfidenceScore: Number(vp.value_confidence_score || 0),
        });

        updateData.adjusted_hours = Number(vp.adjusted_hours || 0);
        updateData.estimated_hours_low = Number(vp.estimated_hours_low || 0);
        updateData.estimated_hours_high = Number(vp.estimated_hours_high || 0);
        updateData.internal_hourly_rate = Number(vp.internal_hourly_rate || 0);
        updateData.pass_through_costs = Number(vp.pass_through_costs || 0);
        updateData.desired_margin_percent = Number(vp.desired_margin_percent || 0);
        updateData.certainty_buffer_percent = Number(vp.certainty_buffer_percent || 0);
        updateData.certainty_premium = pricing.certaintyPremium;
        updateData.value_adjustment = Number(vp.value_adjustment || 0);
        updateData.value_anchor_price = Number(vp.value_anchor_price || 0);
        updateData.value_confidence_score = Number(vp.value_confidence_score || 0);
        updateData.desired_future_state = vp.desired_future_state || null;
        updateData.success_metrics = vp.success_metrics || null;
        updateData.estimated_value = vp.estimated_value ? Number(vp.estimated_value) : null;
        updateData.floor_price = pricing.floor;
        updateData.final_price =
          body.final_price !== undefined && body.final_price !== null
            ? roundUpToNearestThousand(Number(body.final_price))
            : pricing.finalPrice;
      }

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
        const customerWs = await resolveCustomerWorkspaceContext(existingQuote.user_id);
        if ('error' in customerWs) {
          const message =
            customerWs.status === 404
              ? 'Your workspace must be set up before you can approve quotes.'
              : customerWs.error;
          return NextResponse.json({ error: message }, { status: customerWs.status });
        }

        const quoteCents = quotePriceToCents(
          existingQuote.final_price,
          existingQuote.estimated_price
        );

        if (quoteCents > 0) {
          const budget = await getWorkspaceBudgetSnapshot(
            customerWs.admin,
            customerWs.workspace.id
          );
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
        String(updateData.assigned_lead_user_id)
      );
      if (!assigneeValidation.ok) {
        return NextResponse.json(
          { error: assigneeValidation.reason || 'Invalid assignee' },
          { status: 400 }
        );
      }
    }

    // Update quote (with graceful fallback if DB is behind on optional pricing columns)
    let quote: Record<string, unknown> | null = null;
    let updateError: PostgrestError | null = null;
    const safeUpdateData: Record<string, unknown> = { ...updateData };

    while (true) {
      const { data, error } = await supabase
        .from('quotes')
        .update(safeUpdateData)
        .eq('id', id)
        .select()
        .single();

      if (!error) {
        quote = data as Record<string, unknown>;
        break;
      }

      const missingColumn = extractMissingQuotesColumn(error.message);
      if (missingColumn && QUOTE_OPTIONAL_PRICING_COLUMNS.has(missingColumn)) {
        delete safeUpdateData[missingColumn];
        continue;
      }

      updateError = error;
      break;
    }

    if (updateError || !quote) {
      console.error('Error updating quote:', updateError);
      return NextResponse.json({ error: updateError?.message || 'Failed to update quote' }, { status: 500 });
    }

    if (isQuoteManager(platformRole) && Array.isArray(body.milestones)) {
      const milestones = body.milestones
        .map((raw: unknown, index: number) => {
          const m =
            raw && typeof raw === 'object' && raw !== null
              ? (raw as Record<string, unknown>)
              : {};
          const title = typeof m.title === 'string' ? m.title.trim() : '';
          const description = typeof m.description === 'string' ? m.description : null;
          const eh = m.estimated_hours;
          const estimated_hours =
            eh !== undefined && eh !== null ? Number(eh) : null;
          return {
            quote_id: id,
            title,
            description,
            estimated_hours,
            order_index: index,
          };
        })
        .filter((row: { title: string }) => row.title.length > 0);

      const { error: clearMilestonesError } = await supabase
        .from('quote_milestones')
        .delete()
        .eq('quote_id', id);
      if (clearMilestonesError) {
        return NextResponse.json({ error: clearMilestonesError.message }, { status: 500 });
      }

      if (milestones.length > 0) {
        const { error: insertMilestonesError } = await supabase
          .from('quote_milestones')
          .insert(milestones);
        if (insertMilestonesError) {
          return NextResponse.json({ error: insertMilestonesError.message }, { status: 500 });
        }
      }
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
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
    if (isQuoteManager(platformRole) && !selectedWorkspaceId) {
      return NextResponse.json(
        { error: 'Select a client context before deleting quotes.' },
        { status: 400 }
      );
    }
    if (!isQuoteManager(platformRole) && quote.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (isQuoteManager(platformRole) && selectedWorkspaceId) {
      const { data: quoteProject } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', quote.project_id)
        .maybeSingle();
      if (!quoteProject || quoteProject.workspace_id !== selectedWorkspaceId) {
        return NextResponse.json({ error: 'Quote is outside selected client context' }, { status: 403 });
      }
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
