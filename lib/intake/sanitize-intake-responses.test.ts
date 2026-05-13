import { describe, expect, it } from 'vitest'
import { sanitizeAndValidateIntakeResponses } from '@/lib/intake/sanitize-intake-responses'

describe('sanitizeAndValidateIntakeResponses', () => {
  const fields = [
    { field_name: 'country', field_type: 'select', label: 'Country', is_required: true },
    {
      field_name: 'preferred_processor',
      field_type: 'select',
      label: 'Processor',
      is_required: true,
    },
    { field_name: 'notes', field_type: 'textarea', label: 'Notes', is_required: false },
  ]

  const conditions = [
    {
      trigger_field_name: 'country',
      trigger_value: 'United States',
      action: 'show',
      target_field_names: ['preferred_processor'],
    },
    {
      trigger_field_name: 'country',
      trigger_value: 'United Kingdom',
      action: 'show',
      target_field_names: ['preferred_processor'],
    },
  ]

  it('accepts valid visible required fields (OR show rules)', () => {
    const result = sanitizeAndValidateIntakeResponses(
      fields,
      conditions,
      {
        country: 'United States',
        preferred_processor: 'Stripe',
        notes: 'ok',
      }
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.responses.country).toBe('United States')
      expect(result.responses.preferred_processor).toBe('Stripe')
    }
  })

  it('rejects when visible required field is missing', () => {
    const result = sanitizeAndValidateIntakeResponses(
      fields,
      conditions,
      {
        country: 'United States',
      }
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Processor')
    }
  })

  it('does not require hidden show-only fields', () => {
    const result = sanitizeAndValidateIntakeResponses(fields, conditions, {
      country: 'Norway',
      notes: 'Nordic',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.responses.preferred_processor).toBeUndefined()
    }
  })

  it('rejects non-object responses', () => {
    const result = sanitizeAndValidateIntakeResponses(fields, conditions, [])
    expect(result.ok).toBe(false)
  })
})
