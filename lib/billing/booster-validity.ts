/**
 * Booster validity: starts 1st of current month if purchased on 1st–15th (UTC),
 * otherwise 1st of next month. Valid for 3 calendar months from valid_from (inclusive),
 * ending on the last day of the third month.
 */

export type BoosterValidity = {
  validFromIso: string;
  validUntilIso: string;
};

function addUtcMonths(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return new Date(Date.UTC(y, m + months, day));
}

export function computeBoosterValidity(purchaseDate: Date = new Date()): BoosterValidity {
  const y = purchaseDate.getUTCFullYear();
  const m = purchaseDate.getUTCMonth();
  const day = purchaseDate.getUTCDate();

  const validFrom =
    day <= 15 ? new Date(Date.UTC(y, m, 1)) : new Date(Date.UTC(y, m + 1, 1));

  const exclusiveEnd = addUtcMonths(validFrom, 3);
  const validUntil = new Date(exclusiveEnd.getTime() - 86400000);

  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

  return {
    validFromIso: toIsoDate(validFrom),
    validUntilIso: toIsoDate(validUntil),
  };
}
