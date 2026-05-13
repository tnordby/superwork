import { describe, expect, it } from 'vitest'
import { isUuidString } from '@/lib/validation/is-uuid'

describe('isUuidString', () => {
  it('accepts lowercase v4', () => {
    expect(isUuidString('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })
  it('rejects non-uuid', () => {
    expect(isUuidString('not-a-uuid')).toBe(false)
    expect(isUuidString('')).toBe(false)
  })
})
