import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { priceId, workspaceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Check if user has permission for this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    const isOwner = workspace.owner_id === user.id;
    const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to manage billing for this workspace' },
        { status: 403 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId = workspace.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update workspace with customer ID
      await supabase
        .from('workspaces')
        .update({ stripe_customer_id: customerId })
        .eq('id', workspaceId);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${STRIPE_CONFIG.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${STRIPE_CONFIG.appUrl}/billing/cancel`,
      metadata: {
        workspace_id: workspaceId,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
