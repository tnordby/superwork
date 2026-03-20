export interface ValuePricingInput {
  adjustedHours: number;
  internalHourlyRate: number;
  desiredMarginPercent: number;
  valueAdjustment: number;
  estimatedHoursLow?: number;
  estimatedHoursHigh?: number;
  passThroughCosts?: number;
  certaintyBufferPercent?: number;
  valueAnchorPrice?: number;
  valueConfidenceScore?: number;
}

export interface ValuePricingResult {
  floor: number;
  marginPrice: number;
  riskAdjustedFloor: number;
  certaintyPremium: number;
  valueWeightedPrice: number;
  finalPrice: number;
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundUpToNearestThousand(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / 1000) * 1000;
}

export function computeValuePricing(input: ValuePricingInput): ValuePricingResult {
  const adjustedHours = Math.max(0, input.adjustedHours || 0);
  const internalHourlyRate = Math.max(0, input.internalHourlyRate || 0);
  const valueAdjustment = Math.max(0, input.valueAdjustment || 0);
  const desiredMarginPercent = Math.min(90, Math.max(0, input.desiredMarginPercent || 0));
  const estimatedHoursLow = Math.max(0, input.estimatedHoursLow || 0);
  const estimatedHoursHigh = Math.max(estimatedHoursLow, input.estimatedHoursHigh || 0);
  const passThroughCosts = Math.max(0, input.passThroughCosts || 0);
  const certaintyBufferPercent = Math.max(0, input.certaintyBufferPercent || 0);
  const valueAnchorPrice = Math.max(0, input.valueAnchorPrice || 0);
  const valueConfidenceScore = Math.min(100, Math.max(0, input.valueConfidenceScore || 0));

  const effectiveHoursForFloor = estimatedHoursHigh > 0 ? estimatedHoursHigh : adjustedHours;
  const floor = roundPrice(effectiveHoursForFloor * internalHourlyRate + passThroughCosts);
  const marginFactor = 1 - desiredMarginPercent / 100;
  const marginPrice = marginFactor > 0 ? roundPrice(floor / marginFactor) : floor;
  const certaintyPremium = roundPrice((certaintyBufferPercent / 100) * floor);
  const riskAdjustedFloor = roundPrice(marginPrice + certaintyPremium);
  const valueWeightedPrice = roundPrice(
    riskAdjustedFloor + valueAdjustment + valueAnchorPrice * (valueConfidenceScore / 100)
  );
  const finalPrice = roundUpToNearestThousand(Math.max(riskAdjustedFloor, valueWeightedPrice));
  return { floor, marginPrice, riskAdjustedFloor, certaintyPremium, valueWeightedPrice, finalPrice };
}

