import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff, isQuoteManager } from '@/lib/auth/platform-role';
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context';
import { notifyQuoteManagersNewQuoteRequest } from '@/lib/quotes/quote-email-notify';

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
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);

    let query;

    if (isQuoteManager(platformRole)) {
      if (!selectedWorkspaceId) {
        return NextResponse.json(
          { error: 'Select a client context before listing quotes.' },
          { status: 400 }
        );
      }
      const { data: workspaceProjects, error: workspaceProjectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', selectedWorkspaceId);
      if (workspaceProjectsError) {
        return NextResponse.json({ error: workspaceProjectsError.message }, { status: 500 });
      }
      const projectIds = (workspaceProjects || []).map((project: { id: string }) => project.id);
      if (projectIds.length === 0) {
        return NextResponse.json({ quotes: [] }, { status: 200 });
      }
      query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .in('project_id', projectIds);
    } else {
      query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('user_id', user.id);
    }

    const { data: quotes, error } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safeQuotes = (quotes || []).map((q: Record<string, unknown>) => {
      if (isQuoteManager(platformRole)) return q;
      const customerQuote = { ...q };
      delete customerQuote.adjusted_hours;
      delete customerQuote.estimated_hours_low;
      delete customerQuote.estimated_hours_high;
      delete customerQuote.internal_hourly_rate;
      delete customerQuote.pass_through_costs;
      delete customerQuote.desired_margin_percent;
      delete customerQuote.certainty_buffer_percent;
      delete customerQuote.certainty_premium;
      delete customerQuote.value_adjustment;
      delete customerQuote.value_anchor_price;
      delete customerQuote.value_confidence_score;
      delete customerQuote.pricing_rationale;
      delete customerQuote.floor_price;
      return customerQuote;
    });

    return NextResponse.json({ quotes: safeQuotes }, { status: 200 });
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
    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);

    // Validate required fields
    if (!body.title || !body.category || !body.service_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, service_type' },
        { status: 400 }
      );
    }

    let projectOwnerId = user.id;
    if (body.project_id) {
      const { data: projectForClientInfo } = await supabase
        .from('projects')
        .select('user_id, workspace_id')
        .eq('id', body.project_id)
        .maybeSingle();
      if (isInternalStaff(platformRole) && selectedWorkspaceId) {
        if (!projectForClientInfo || projectForClientInfo.workspace_id !== selectedWorkspaceId) {
          return NextResponse.json(
            { error: 'Project is outside selected client context' },
            { status: 403 }
          );
        }
      }
      if (projectForClientInfo?.user_id) {
        projectOwnerId = projectForClientInfo.user_id;
      }
    } else if (isInternalStaff(platformRole)) {
      return NextResponse.json(
        { error: 'Internal quote creation requires project_id for tenant-safe context' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, company_name')
      .eq('id', projectOwnerId)
      .maybeSingle();

    // Create quote
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        user_id: user.id,
        client_first_name: profile?.first_name || null,
        client_last_name: profile?.last_name || null,
        client_email: profile?.email || null,
        client_company_name: profile?.company_name || null,
        title: body.title,
        description: body.description,
        project_id: body.project_id || null,
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

    if (quote?.id && body.project_id) {
      const { data: projectMilestones } = await supabase
        .from('project_milestones')
        .select('title, description, order_index')
        .eq('project_id', body.project_id)
        .order('order_index', { ascending: true });

      if (projectMilestones && projectMilestones.length > 0) {
        await supabase.from('quote_milestones').insert(
          projectMilestones.map((m) => ({
            quote_id: quote.id,
            title: m.title,
            description: m.description,
            order_index: m.order_index ?? 0,
            estimated_hours: null,
          }))
        );
      }
    }

    if (quote?.id) {
      void notifyQuoteManagersNewQuoteRequest({
        quoteId: quote.id,
        quoteTitle: typeof quote.title === 'string' ? quote.title : String(body.title || ''),
        submittedByUserId: user.id,
      });
    }

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    console.error('Error in quotes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
