import { describe, expect, it } from 'vitest'
import { computeVisibleIntakeFieldNames } from '@/lib/intake/compute-visible-intake-fields'

describe('computeVisibleIntakeFieldNames', () => {
  const baseFields = ['country', 'preferred_processor', 'notes']

  it('shows a show-only target when any of several OR triggers matches (US / UK / CA)', () => {
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
      {
        trigger_field_name: 'country',
        trigger_value: 'Canada',
        action: 'show',
        target_field_names: ['preferred_processor'],
      },
    ]

    const visibleUs = computeVisibleIntakeFieldNames(baseFields, conditions, {
      country: 'United States',
    })
    expect(visibleUs.has('preferred_processor')).toBe(true)
    expect(visibleUs.has('notes')).toBe(true)

    const visibleUk = computeVisibleIntakeFieldNames(baseFields, conditions, {
      country: 'United Kingdom',
    })
    expect(visibleUk.has('preferred_processor')).toBe(true)

    const visibleNo = computeVisibleIntakeFieldNames(baseFields, conditions, {
      country: 'Norway',
    })
    expect(visibleNo.has('preferred_processor')).toBe(false)
    expect(visibleNo.has('notes')).toBe(true)
  })

  it('ORs multiple show rules for the same multiselect trigger (revenue_model → subscription_complexity)', () => {
    const fields = ['revenue_model', 'subscription_complexity', 'x']
    const conditions = [
      {
        trigger_field_name: 'revenue_model',
        trigger_value: 'Monthly subscriptions',
        action: 'show',
        target_field_names: ['subscription_complexity'],
      },
      {
        trigger_field_name: 'revenue_model',
        trigger_value: 'Annual subscriptions',
        action: 'show',
        target_field_names: ['subscription_complexity'],
      },
    ]

    const v = computeVisibleIntakeFieldNames(fields, conditions, {
      revenue_model: ['Monthly subscriptions'],
    })
    expect(v.has('subscription_complexity')).toBe(true)
  })

  it('applies hide when trigger matches', () => {
    const fields = ['tier', 'extra']
    const conditions = [
      {
        trigger_field_name: 'tier',
        trigger_value: 'Free',
        action: 'hide',
        target_field_names: ['extra'],
      },
    ]
    const hidden = computeVisibleIntakeFieldNames(fields, conditions, { tier: 'Free' })
    expect(hidden.has('extra')).toBe(false)
    expect(hidden.has('tier')).toBe(true)

    const shown = computeVisibleIntakeFieldNames(fields, conditions, { tier: 'Pro' })
    expect(shown.has('extra')).toBe(true)
  })
})
