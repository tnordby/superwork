import { stripe } from './config';
import Stripe from 'stripe';

/**
 * Server-side Stripe helper functions
 * These require the Stripe SDK and should only be used in API routes or server components
 */

// Re-export utility functions for convenience
export * from './utils';

/**
 * Get all available subscription plans from Stripe
 */
export async function getSubscriptionPlans() {
  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });

    return prices.data.map((price) => {
      const product = price.product as Stripe.Product;
      return {
        id: price.id,
        productId: product.id,
        productName: product.name,
        description: product.description,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        intervalCount: price.recurring?.interval_count,
        metadata: product.metadata,
      };
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }
}

/**
 * Get subscription details for a customer
 */
export async function getCustomerSubscription(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    });

    return subscriptions.data[0] || null;
  } catch (error) {
    console.error('Error fetching customer subscription:', error);
    return null;
  }
}

/**
 * Get invoice history for a customer
 */
export async function getCustomerInvoices(customerId: string, limit = 10) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: new Date(invoice.created * 1000),
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url,
    }));
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return [];
  }
}
