/**
 * Portal capacity pricing (EUR). Hourly rate is internal — never expose as a customer-facing label.
 */

export const CAPACITY_HOURLY_RATE_EUR = 175;

export const SUBSCRIPTION_MONTHLY_MIN_EUR = 4_000;
export const SUBSCRIPTION_MONTHLY_MAX_EUR = 30_000;
export const SUBSCRIPTION_STEP_EUR = 500;

export const ANNUAL_PREPAY_DISCOUNT = 0.08;

/** Longer commitments than monthly: applied to the gross amount for that billing period (EUR). */
export const QUARTERLY_COMMITMENT_DISCOUNT = 0.02;
export const BIANNUAL_COMMITMENT_DISCOUNT = 0.05;

export const CAPACITY_BILLING_PERIODS = ['monthly', 'quarterly', 'biannual', 'annual'] as const;
export type CapacityBillingPeriod = (typeof CAPACITY_BILLING_PERIODS)[number];

export function parseCapacityBillingPeriod(raw: unknown): CapacityBillingPeriod | null {
  if (raw === 'monthly' || raw === 'quarterly' || raw === 'biannual' || raw === 'annual') {
    return raw;
  }
  return null;
}

export function commitmentDiscountForPeriod(period: CapacityBillingPeriod): number {
  switch (period) {
    case 'monthly':
      return 0;
    case 'quarterly':
      return QUARTERLY_COMMITMENT_DISCOUNT;
    case 'biannual':
      return BIANNUAL_COMMITMENT_DISCOUNT;
    case 'annual':
      return ANNUAL_PREPAY_DISCOUNT;
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}

/** Maps Stripe `Price.recurring` to our portal billing period (null if unsupported). */
export function capacityBillingPeriodFromStripeRecurring(
  interval: string | undefined,
  intervalCount: number | undefined
): CapacityBillingPeriod | null {
  const count = intervalCount ?? 1;
  if (interval === 'year' && count === 1) return 'annual';
  if (interval === 'month') {
    if (count === 1) return 'monthly';
    if (count === 3) return 'quarterly';
    if (count === 6) return 'biannual';
  }
  return null;
}

export function stripeRecurringForCapacityPeriod(period: CapacityBillingPeriod): {
  interval: 'month' | 'year';
  interval_count: number;
} {
  switch (period) {
    case 'monthly':
      return { interval: 'month', interval_count: 1 };
    case 'quarterly':
      return { interval: 'month', interval_count: 3 };
    case 'biannual':
      return { interval: 'month', interval_count: 6 };
    case 'annual':
      return { interval: 'year', interval_count: 1 };
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}

const COMMITMENT_MONTHS: Record<CapacityBillingPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
};

/** One Stripe invoice amount (EUR) for the selected commitment (after period discount). */
export function commitmentPeriodChargeEur(monthlyEur: number, period: CapacityBillingPeriod): number {
  assertValidSubscriptionMonthly(monthlyEur);
  const months = COMMITMENT_MONTHS[period];
  const d = commitmentDiscountForPeriod(period);
  const raw = monthlyEur * months * (1 - d);
  return Math.round(raw * 100) / 100;
}

export function commitmentPeriodChargeCents(monthlyEur: number, period: CapacityBillingPeriod): number {
  return Math.round(commitmentPeriodChargeEur(monthlyEur, period) * 100);
}

/** Gross (no discount) for the same covered months — for “you save” UI. */
export function commitmentGrossEur(monthlyEur: number, period: CapacityBillingPeriod): number {
  assertValidSubscriptionMonthly(monthlyEur);
  const months = COMMITMENT_MONTHS[period];
  return Math.round(monthlyEur * months * 100) / 100;
}

export function commitmentSavingsVsGrossEur(monthlyEur: number, period: CapacityBillingPeriod): number {
  const gross = commitmentGrossEur(monthlyEur, period);
  const charged = commitmentPeriodChargeEur(monthlyEur, period);
  return Math.round((gross - charged) * 100) / 100;
}

/**
 * Reverse-engineers the portal monthly budget (EUR) from a Stripe recurring unit amount (cents).
 * Used when `workspace_plan_terms` is missing but Stripe subscription exists.
 */
export function monthlyBudgetFromStripeRecurringUnitAmount(
  unitAmountCents: number,
  interval: string | undefined,
  intervalCount: number | undefined
): number | null {
  const period = capacityBillingPeriodFromStripeRecurring(interval, intervalCount);
  if (!period) return null;
  const major = unitAmountCents / 100;
  const months = COMMITMENT_MONTHS[period];
  const d = commitmentDiscountForPeriod(period);
  if (months === 1) return Math.round(major * 100) / 100;
  return Math.round((major / (months * (1 - d))) * 100) / 100;
}

export const BOOSTER_GLOBAL_MAX_EUR = 50_000;
export const BOOSTER_MULTIPLIER_MAX = 5;
/** Minimum Booster checkout (EUR); may be lowered when 5× monthly is below this. */
export const BOOSTER_MIN_PURCHASE_EUR = 3_000;

/** Slider tick labels (€) for subscription UI. */
export const SUBSCRIPTION_ANCHOR_EUR = [4_000, 6_000, 8_000, 10_000, 15_000, 20_000, 25_000, 30_000] as const;

export type PricingModel = 'slider_v1' | 'legacy_tier' | 'enterprise_custom';

export function roundToHalfHour(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.round(hours * 2) / 2;
}

export function hoursFromBudgetEur(budgetEur: number): number {
  if (!Number.isFinite(budgetEur) || budgetEur <= 0) return 0;
  return roundToHalfHour(budgetEur / CAPACITY_HOURLY_RATE_EUR);
}

export function isMultipleOfStep(amountEur: number, stepEur: number): boolean {
  if (!Number.isFinite(amountEur) || !Number.isFinite(stepEur) || stepEur <= 0) return false;
  const n = Math.round(amountEur / stepEur);
  return Math.abs(amountEur - n * stepEur) < 1e-6;
}

export function assertValidSubscriptionMonthly(amountEur: number): void {
  if (!Number.isFinite(amountEur)) {
    throw new Error('Invalid amount');
  }
  if (amountEur < SUBSCRIPTION_MONTHLY_MIN_EUR || amountEur > SUBSCRIPTION_MONTHLY_MAX_EUR) {
    throw new Error('Amount outside allowed subscription range');
  }
  if (!isMultipleOfStep(amountEur, SUBSCRIPTION_STEP_EUR)) {
    throw new Error('Amount must be in €500 increments');
  }
}

export function annualAmountEur(monthlyEur: number, annualPrepay: boolean): number {
  assertValidSubscriptionMonthly(monthlyEur);
  const rawAnnual = monthlyEur * 12;
  if (!annualPrepay) return rawAnnual;
  return Math.round(rawAnnual * (1 - ANNUAL_PREPAY_DISCOUNT) * 100) / 100;
}

export function annualPrepaySavingsEur(monthlyEur: number): number {
  assertValidSubscriptionMonthly(monthlyEur);
  const full = monthlyEur * 12;
  const discounted = Math.round(full * (1 - ANNUAL_PREPAY_DISCOUNT) * 100) / 100;
  return Math.round((full - discounted) * 100) / 100;
}

export function boosterMinEur(monthlySubscriptionEur: number): number {
  const floor = roundBoosterAmountToStep(BOOSTER_MIN_PURCHASE_EUR);
  if (!Number.isFinite(monthlySubscriptionEur) || monthlySubscriptionEur <= 0) {
    return floor;
  }
  const max = boosterMaxEur(monthlySubscriptionEur);
  return Math.min(floor, max);
}

export function boosterMaxEur(monthlySubscriptionEur: number): number {
  if (!Number.isFinite(monthlySubscriptionEur) || monthlySubscriptionEur <= 0) {
    return 0;
  }
  const cap = Math.min(monthlySubscriptionEur * BOOSTER_MULTIPLIER_MAX, BOOSTER_GLOBAL_MAX_EUR);
  return roundBoosterAmountToStep(cap);
}

function roundBoosterAmountToStep(amountEur: number): number {
  if (!Number.isFinite(amountEur)) return SUBSCRIPTION_MONTHLY_MIN_EUR;
  const n = Math.round(amountEur / SUBSCRIPTION_STEP_EUR);
  return n * SUBSCRIPTION_STEP_EUR;
}

export function assertValidBoosterAmount(amountEur: number, monthlySubscriptionEur: number): void {
  const min = boosterMinEur(monthlySubscriptionEur);
  const max = boosterMaxEur(monthlySubscriptionEur);
  if (amountEur < min || amountEur > max) {
    throw new Error('Booster amount outside allowed range');
  }
  if (!isMultipleOfStep(amountEur, SUBSCRIPTION_STEP_EUR)) {
    throw new Error('Booster amount must be in €500 increments');
  }
}

export function boosterMultiplierLabel(amountEur: number, monthlySubscriptionEur: number): string {
  if (!Number.isFinite(amountEur) || !Number.isFinite(monthlySubscriptionEur) || monthlySubscriptionEur <= 0) {
    return '—';
  }
  const x = amountEur / monthlySubscriptionEur;
  const rounded = Math.round(x * 100) / 100;
  return `${rounded}× your monthly subscription`;
}

export function subscriptionSliderIndexCount(): number {
  return (SUBSCRIPTION_MONTHLY_MAX_EUR - SUBSCRIPTION_MONTHLY_MIN_EUR) / SUBSCRIPTION_STEP_EUR + 1;
}

export function subscriptionMonthlyFromSliderIndex(index: number): number {
  const maxIdx = subscriptionSliderIndexCount() - 1;
  const clamped = Math.max(0, Math.min(maxIdx, Math.floor(index)));
  return SUBSCRIPTION_MONTHLY_MIN_EUR + clamped * SUBSCRIPTION_STEP_EUR;
}

export function subscriptionSliderIndexFromMonthly(monthlyEur: number): number {
  assertValidSubscriptionMonthly(monthlyEur);
  return (monthlyEur - SUBSCRIPTION_MONTHLY_MIN_EUR) / SUBSCRIPTION_STEP_EUR;
}

export function boosterSliderIndexCount(monthlySubscriptionEur: number): number {
  const min = boosterMinEur(monthlySubscriptionEur);
  const max = boosterMaxEur(monthlySubscriptionEur);
  if (max < min) return 1;
  return (max - min) / SUBSCRIPTION_STEP_EUR + 1;
}

export function boosterAmountFromSliderIndex(monthlySubscriptionEur: number, index: number): number {
  const min = boosterMinEur(monthlySubscriptionEur);
  const count = boosterSliderIndexCount(monthlySubscriptionEur);
  const clamped = Math.max(0, Math.min(count - 1, Math.floor(index)));
  return min + clamped * SUBSCRIPTION_STEP_EUR;
}

export function boosterSliderIndexFromAmount(monthlySubscriptionEur: number, amountEur: number): number {
  const min = boosterMinEur(monthlySubscriptionEur);
  assertValidBoosterAmount(amountEur, monthlySubscriptionEur);
  return (amountEur - min) / SUBSCRIPTION_STEP_EUR;
}

export function boosterAnchorIndices(monthlySubscriptionEur: number): { label: string; index: number }[] {
  const anchors = [1, 1.5, 2, 3] as const;
  const out: { label: string; index: number }[] = [];
  for (const m of anchors) {
    const target = monthlySubscriptionEur * m;
    const clamped = Math.min(boosterMaxEur(monthlySubscriptionEur), Math.max(boosterMinEur(monthlySubscriptionEur), target));
    const rounded = roundBoosterAmountToStep(clamped);
    const idx = Math.round((rounded - boosterMinEur(monthlySubscriptionEur)) / SUBSCRIPTION_STEP_EUR);
    out.push({ label: `${m}×`, index: idx });
  }
  return out;
}
