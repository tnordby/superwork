import { describe, expect, it } from 'vitest'
import { assertIntakeMatchesProject } from '@/lib/intake/assert-intake-matches-project'

describe('assertIntakeMatchesProject', () => {
  it('allows when project has no service_template_id', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(assertIntakeMatchesProject({ service_template_id: null }, id)).toEqual({ ok: true })
  })

  it('allows matching template id', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(assertIntakeMatchesProject({ service_template_id: id }, id)).toEqual({ ok: true })
  })

  it('rejects mismatch', () => {
    const a = '550e8400-e29b-41d4-a716-446655440000'
    const b = '650e8400-e29b-41d4-a716-446655440001'
    const r = assertIntakeMatchesProject({ service_template_id: a }, b)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(409)
    }
  })
})
