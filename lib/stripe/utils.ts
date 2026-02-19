/**
 * Client-safe utility functions for Stripe
 * These don't require the Stripe SDK and can be used in client components
 */

/**
 * Format billing interval for display
 */
export function formatBillingInterval(interval?: string): string {
  switch (interval) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'biannual':
      return 'Bi-Annual';
    case 'annual':
      return 'Annual';
    default:
      return 'Monthly';
  }
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status?: string): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'green' };
    case 'trialing':
      return { label: 'Trial', color: 'blue' };
    case 'past_due':
      return { label: 'Past Due', color: 'orange' };
    case 'canceled':
      return { label: 'Cancelled', color: 'red' };
    case 'incomplete':
      return { label: 'Incomplete', color: 'yellow' };
    case 'incomplete_expired':
      return { label: 'Expired', color: 'red' };
    default:
      return { label: 'Unknown', color: 'gray' };
  }
}

/**
 * Format currency amount for display
 */
export function formatAmount(amount: number | null, currency: string = 'usd'): string {
  if (amount === null) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Calculate savings percentage for annual vs monthly billing
 */
export function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
  const annualEquivalent = monthlyPrice * 12;
  const savings = ((annualEquivalent - annualPrice) / annualEquivalent) * 100;
  return Math.round(savings);
}
