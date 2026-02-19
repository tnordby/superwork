/**
 * Access control utilities based on subscription status
 */

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | null;

export type AccessLevel = 'full' | 'limited' | 'none';

/**
 * Determine access level based on subscription status
 */
export function getAccessLevel(status: SubscriptionStatus): AccessLevel {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'full';

    case 'past_due':
      return 'limited';

    case 'canceled':
    case 'incomplete_expired':
    case null:
      return 'none';

    case 'incomplete':
      return 'none';

    default:
      return 'none';
  }
}

/**
 * Check if workspace has active subscription
 */
export function hasActiveSubscription(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Check if workspace subscription is past due
 */
export function isPastDue(status: SubscriptionStatus): boolean {
  return status === 'past_due';
}

/**
 * Check if workspace needs to resubscribe
 */
export function needsResubscription(status: SubscriptionStatus): boolean {
  return (
    status === 'canceled' ||
    status === 'incomplete_expired' ||
    status === null
  );
}

/**
 * Get redirect path based on subscription status
 */
export function getSubscriptionRedirectPath(
  status: SubscriptionStatus,
  currentPath: string
): string | null {
  const accessLevel = getAccessLevel(status);

  // Don't redirect if already on billing pages
  if (currentPath.startsWith('/billing')) {
    return null;
  }

  // Full access - no redirect needed
  if (accessLevel === 'full') {
    return null;
  }

  // Limited access (past_due) - show banner but don't redirect
  if (accessLevel === 'limited') {
    return null;
  }

  // No access - redirect to plans
  if (accessLevel === 'none') {
    return '/billing/plans';
  }

  return null;
}
