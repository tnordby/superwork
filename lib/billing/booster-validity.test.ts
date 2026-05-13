import { describe, expect, it } from 'vitest';
import { computeBoosterValidity } from './booster-validity';

describe('computeBoosterValidity', () => {
  it('uses 1st of current month when purchased by the 15th (UTC)', () => {
    const { validFromIso, validUntilIso } = computeBoosterValidity(new Date(Date.UTC(2026, 2, 10)));
    expect(validFromIso).toBe('2026-03-01');
    expect(validUntilIso).toBe('2026-05-31');
  });

  it('uses 1st of next month when purchased after the 15th (UTC)', () => {
    const { validFromIso, validUntilIso } = computeBoosterValidity(new Date(Date.UTC(2026, 2, 20)));
    expect(validFromIso).toBe('2026-04-01');
    expect(validUntilIso).toBe('2026-06-30');
  });
});
