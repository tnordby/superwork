import { describe, expect, it } from 'vitest';
import { evaluateProjectCreationEligibility } from './project-creation-eligibility';

describe('evaluateProjectCreationEligibility', () => {
  it('allows when on active plan and balance available', () => {
    const result = evaluateProjectCreationEligibility({
      stripeSubscriptionStatus: 'active',
      availableBalanceCents: 5000,
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks when not on active plan', () => {
    const result = evaluateProjectCreationEligibility({
      stripeSubscriptionStatus: 'canceled',
      availableBalanceCents: 5000,
    });
    expect(result.allowed).toBe(false);
    expect(result.hasActivePlan).toBe(false);
  });

  it('blocks when available balance is zero', () => {
    const result = evaluateProjectCreationEligibility({
      stripeSubscriptionStatus: 'active',
      availableBalanceCents: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.hasAvailableBalance).toBe(false);
  });

  it('blocks when no plan and no balance', () => {
    const result = evaluateProjectCreationEligibility({
      stripeSubscriptionStatus: null,
      availableBalanceCents: 0,
    });
    expect(result.allowed).toBe(false);
  });
});
