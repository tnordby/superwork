/** Same shape as values in DynamicIntakeForm responses (JSON-serializable). */
export type IntakeTriggerValue = string | number | boolean | string[] | undefined

/**
 * Returns whether an intake condition trigger_value matches the current response.
 * Multiselect fields store string[]; other field types use scalar equality.
 */
export function intakeConditionMatches(
  triggerValue: IntakeTriggerValue,
  expected: string
): boolean {
  if (Array.isArray(triggerValue)) {
    return triggerValue.includes(expected)
  }
  if (triggerValue === undefined || triggerValue === null) {
    return false
  }
  return String(triggerValue) === expected
}
