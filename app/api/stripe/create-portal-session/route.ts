import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import { portalCustomerModeMismatchResponse } from '@/lib/stripe/stripe-customer-mode-mismatch';
import {
  stripeTestSecretInProductionPortalErrorBody,
  stripeTestSecretKeyInProductionDeploy,
} from '@/lib/stripe/stripe-secret-production-mismatch';
import { createClient } from '@/lib/supabase/server';

function billingPortalReturnUrl(): string {
  const base = (STRIPE_CONFIG.appUrl || '').replace(/\/+$/, '');
  if (!base) return 'http://localhost:3000/billing';
  return `${base}/billing`;
}

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
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
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
      .maybeSingle();

    const isOwner = workspace.owner_id === user.id;
    const isAdmin = membership?.role === 'admin' || membership?.role === 'owner';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to manage billing for this workspace' },
        { status: 403 }
      );
    }

    // Check if workspace has a Stripe customer ID
    if (!workspace.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    if (stripeTestSecretKeyInProductionDeploy()) {
      return NextResponse.json(stripeTestSecretInProductionPortalErrorBody(), { status: 503 });
    }

    // Create billing portal session (requires Customer Portal enabled in Stripe + return URL allowlisted)
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: billingPortalReturnUrl(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);

    if (error instanceof Stripe.errors.StripeError) {
      const msg = (error.message || '').toLowerCase();
      console.error('[create-portal-session] Stripe', error.code, error.message);

      if (
        msg.includes('portal') ||
        msg.includes('customer portal') ||
        msg.includes('billing portal') ||
        msg.includes('no active configuration') ||
        error.code === 'customer_portal_settings_invalid'
      ) {
        return NextResponse.json(
          {
            error:
              'Stripe Customer Portal is not active for this account. In Stripe Dashboard (same mode as your API keys): Settings → Billing → Customer portal — turn it on, save, and add your return URL (e.g. https://app.superwork.co/billing) under allowed return URLs.',
          },
          { status: 503 }
        );
      }

      if (
        error.code === 'resource_missing' ||
        msg.includes('no such customer') ||
        msg.includes('similar object exists in test mode') ||
        msg.includes('similar object exists in live mode')
      ) {
        return NextResponse.json(portalCustomerModeMismatchResponse(error.message || ''), { status: 502 });
      }

      if (msg.includes('return_url') || msg.includes('return url')) {
        return NextResponse.json(
          {
            error:
              'Stripe rejected the return URL. In Customer portal settings, add the exact URL your app uses after checkout (NEXT_PUBLIC_APP_URL + /billing), e.g. https://app.superwork.co/billing',
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: `Billing portal could not be opened (${error.code || 'stripe'}). Check Stripe Dashboard logs for this request.` },
        { status: 502 }
      );
    }

    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
