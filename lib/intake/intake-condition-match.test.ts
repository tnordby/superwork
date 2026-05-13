import { describe, expect, it } from 'vitest'
import { intakeConditionMatches } from '@/lib/intake/intake-condition-match'

describe('intakeConditionMatches', () => {
  it('matches multiselect when array includes trigger value', () => {
    expect(
      intakeConditionMatches(['Monthly subscriptions', 'One-time sales'], 'Monthly subscriptions')
    ).toBe(true)
    expect(intakeConditionMatches([], 'Monthly subscriptions')).toBe(false)
  })

  it('matches select and radio as string equality', () => {
    expect(intakeConditionMatches('United States', 'United States')).toBe(true)
    expect(intakeConditionMatches('Canada', 'United States')).toBe(false)
  })

  it('treats nullish as no match', () => {
    expect(intakeConditionMatches(undefined, 'Yes')).toBe(false)
  })
})
