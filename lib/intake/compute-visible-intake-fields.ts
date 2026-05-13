import { intakeConditionMatches, type IntakeTriggerValue } from '@/lib/intake/intake-condition-match'

export type IntakeVisibilityCondition = {
  trigger_field_name: string
  trigger_value: string
  action: string
  target_field_names: string[]
}

/**
 * Computes which intake fields are visible given conditional rules.
 * - Targets of any `show` rule start hidden until at least one matching `show` applies (OR).
 * - Fields never targeted by `show` start visible.
 * - `hide` rules remove targets when the trigger matches; when it does not match, targets are shown again.
 */
export function computeVisibleIntakeFieldNames(
  fieldNames: string[],
  conditions: IntakeVisibilityCondition[],
  responses: Record<string, IntakeTriggerValue>
): Set<string> {
  const showTargets = new Set<string>()
  for (const c of conditions) {
    if (c.action === 'show') {
      c.target_field_names.forEach((n) => showTargets.add(n))
    }
  }

  const visible = new Set(fieldNames.filter((n) => !showTargets.has(n)))

  for (const condition of conditions) {
    if (condition.action !== 'show') continue
    const triggerValue = responses[condition.trigger_field_name]
    if (intakeConditionMatches(triggerValue, condition.trigger_value)) {
      condition.target_field_names.forEach((name) => visible.add(name))
    }
  }

  for (const condition of conditions) {
    if (condition.action !== 'hide') continue
    const triggerValue = responses[condition.trigger_field_name]
    const matches = intakeConditionMatches(triggerValue, condition.trigger_value)
    if (matches) {
      condition.target_field_names.forEach((name) => visible.delete(name))
    } else {
      condition.target_field_names.forEach((name) => visible.add(name))
    }
  }

  return visible
}
