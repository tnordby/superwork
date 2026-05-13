import { describe, expect, it } from 'vitest';
import {
  annualPrepaySavingsEur,
  assertValidBoosterAmount,
  assertValidSubscriptionMonthly,
  boosterAmountFromSliderIndex,
  boosterMaxEur,
  boosterMinEur,
  boosterMultiplierLabel,
  commitmentPeriodChargeEur,
  commitmentSavingsVsGrossEur,
  hoursFromBudgetEur,
  monthlyBudgetFromStripeRecurringUnitAmount,
  subscriptionMonthlyFromSliderIndex,
  subscriptionSliderIndexCount,
} from './capacity-pricing';

describe('capacity-pricing', () => {
  it('computes hours at internal rate (rounded to nearest 0.5h)', () => {
    expect(hoursFromBudgetEur(4000)).toBe(23);
    expect(hoursFromBudgetEur(175)).toBe(1);
  });

  it('validates subscription monthly increments and bounds', () => {
    expect(() => assertValidSubscriptionMonthly(3999)).toThrow();
    expect(() => assertValidSubscriptionMonthly(4250)).toThrow();
    expect(() => assertValidSubscriptionMonthly(30_500)).toThrow();
    expect(() => assertValidSubscriptionMonthly(8000)).not.toThrow();
  });

  it('maps subscription slider endpoints', () => {
    expect(subscriptionSliderIndexCount()).toBe(53);
    expect(subscriptionMonthlyFromSliderIndex(0)).toBe(4000);
    expect(subscriptionMonthlyFromSliderIndex(52)).toBe(30_000);
  });

  it('annual prepay savings is 8% of gross annual', () => {
    expect(annualPrepaySavingsEur(4000)).toBeCloseTo(4000 * 12 * 0.08, 1);
  });

  it('commitment period charges apply discounts for quarterly, bi-annual, annual', () => {
    expect(commitmentPeriodChargeEur(4000, 'monthly')).toBe(4000);
    expect(commitmentPeriodChargeEur(4000, 'quarterly')).toBeCloseTo(4000 * 3 * 0.98, 1);
    expect(commitmentPeriodChargeEur(4000, 'biannual')).toBeCloseTo(4000 * 6 * 0.95, 1);
    expect(commitmentPeriodChargeEur(4000, 'annual')).toBeCloseTo(4000 * 12 * 0.92, 1);
  });

  it('commitment savings vs gross is zero for monthly', () => {
    expect(commitmentSavingsVsGrossEur(8000, 'monthly')).toBe(0);
    expect(commitmentSavingsVsGrossEur(8000, 'annual')).toBeGreaterThan(0);
  });

  it('reconstructs monthly budget from Stripe recurring unit amount', () => {
    const monthly = 10_000;
    expect(
      monthlyBudgetFromStripeRecurringUnitAmount(Math.round(monthly * 100), 'month', 1)
    ).toBe(monthly);
    const annualCents = Math.round(monthly * 12 * (1 - 0.08) * 100);
    expect(monthlyBudgetFromStripeRecurringUnitAmount(annualCents, 'year', 1)).toBeCloseTo(monthly, 1);
    const qCents = Math.round(monthly * 3 * (1 - 0.02) * 100);
    expect(monthlyBudgetFromStripeRecurringUnitAmount(qCents, 'month', 3)).toBeCloseTo(monthly, 1);
  });

  it('booster min is €3k when monthly allows; max still 5× capped at €50k', () => {
    expect(boosterMinEur(3500)).toBe(3000);
    expect(boosterMaxEur(3500)).toBe(17_500);
    expect(boosterMinEur(2000)).toBe(3000);
    expect(boosterMaxEur(2000)).toBe(10_000);
    expect(boosterMinEur(500)).toBe(2500);
    expect(boosterMaxEur(500)).toBe(2500);
  });

  it('booster max is 5× monthly capped at €50k', () => {
    expect(boosterMaxEur(4000)).toBe(20_000);
    expect(boosterMaxEur(12_000)).toBe(50_000);
  });

  it('assertValidBoosterAmount accepts stepped amounts in range', () => {
    expect(() => assertValidBoosterAmount(12_000, 4000)).not.toThrow();
    expect(() => assertValidBoosterAmount(3000, 3500)).not.toThrow();
    expect(() => assertValidBoosterAmount(3500, 3500)).not.toThrow();
    expect(() => assertValidBoosterAmount(2000, 4000)).toThrow();
    expect(() => assertValidBoosterAmount(2500, 4000)).toThrow();
  });

  it('booster slider covers min to max in €500 steps', () => {
    expect(boosterAmountFromSliderIndex(4000, 0)).toBe(3000);
    expect(boosterAmountFromSliderIndex(4000, 34)).toBe(20_000);
  });

  it('booster multiplier label', () => {
    expect(boosterMultiplierLabel(8000, 4000)).toContain('2');
  });
});
