import { describe, expect, it } from 'vitest'
import {
  pickVisibleIntakeResponses,
  validateIntakeResponses,
} from '@/lib/intake/validate-intake-responses'

describe('validateIntakeResponses', () => {
  const fields = [
    { field_name: 'a', field_type: 'text', label: 'A', is_required: true },
    { field_name: 'b', field_type: 'text', label: 'B', is_required: true },
    { field_name: 'c', field_type: 'multiselect', label: 'C', is_required: true },
  ]

  it('ignores required fields that are not visible', () => {
    const err = validateIntakeResponses(
      fields,
      { a: '', b: 'ok', c: [] },
      new Set(['b'])
    )
    expect(err).toBeNull()
  })

  it('requires visible required fields to be filled', () => {
    const err = validateIntakeResponses(
      fields,
      { a: 'x', b: '', c: ['one'] },
      new Set(['a', 'b', 'c'])
    )
    expect(err).toContain('B')
  })

  it('rejects empty multiselect when required and visible', () => {
    const err = validateIntakeResponses(fields, { a: 'x', b: 'y', c: [] }, new Set(['c']))
    expect(err).toContain('C')
  })
})

describe('pickVisibleIntakeResponses', () => {
  it('keeps only keys that are visible', () => {
    const out = pickVisibleIntakeResponses(
      { a: 1, b: 2, c: 3 },
      new Set(['a', 'c'])
    )
    expect(out).toEqual({ a: 1, c: 3 })
  })
})
