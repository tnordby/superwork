import {
  computeVisibleIntakeFieldNames,
  type IntakeVisibilityCondition,
} from '@/lib/intake/compute-visible-intake-fields'
import {
  pickVisibleIntakeResponses,
  validateIntakeResponses,
  type IntakeFieldForValidation,
  type IntakeResponseMap,
} from '@/lib/intake/validate-intake-responses'
import type { IntakeTriggerValue } from '@/lib/intake/intake-condition-match'

export type IntakeFieldRow = IntakeFieldForValidation

/** Guardrails against oversized payloads (DoS / accidental huge pastes). */
const MAX_RESPONSE_KEYS = 256
const MAX_STRING_CHARS = 100_000

function coerceValue(
  field: IntakeFieldRow,
  raw: unknown
): { ok: true; value: IntakeResponseMap[string] } | { ok: false; message: string } {
  const { field_type, label } = field

  if (raw === undefined || raw === null) {
    return { ok: true, value: undefined }
  }

  if (field_type === 'multiselect') {
    if (!Array.isArray(raw)) {
      return { ok: false, message: `${label}: multiselect must be an array.` }
    }
    const strings = raw.filter((x): x is string => typeof x === 'string')
    if (strings.length !== raw.length) {
      return { ok: false, message: `${label}: multiselect values must be strings.` }
    }
    for (const s of strings) {
      if (s.length > MAX_STRING_CHARS) {
        return { ok: false, message: `${label}: multiselect value is too long.` }
      }
    }
    return { ok: true, value: strings }
  }

  if (field_type === 'checkbox') {
    if (typeof raw !== 'boolean') {
      return { ok: false, message: `${label}: must be a boolean.` }
    }
    return { ok: true, value: raw }
  }

  if (field_type === 'number') {
    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      return { ok: true, value: raw }
    }
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw)
      if (!Number.isNaN(n)) return { ok: true, value: n }
    }
    return { ok: false, message: `${label}: must be a number.` }
  }

  if (
    field_type === 'text' ||
    field_type === 'email' ||
    field_type === 'url' ||
    field_type === 'textarea' ||
    field_type === 'select' ||
    field_type === 'radio' ||
    field_type === 'date'
  ) {
    if (typeof raw !== 'string') {
      return { ok: false, message: `${label}: must be a string.` }
    }
    if (raw.length > MAX_STRING_CHARS) {
      return { ok: false, message: `${label}: value is too long.` }
    }
    return { ok: true, value: raw }
  }

  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { ok: true, value: raw }
  }

  return { ok: false, message: `${label}: unsupported value type.` }
}

/**
 * Strips unknown keys, coerces types, validates visible required fields, returns payload safe to persist.
 */
export function sanitizeAndValidateIntakeResponses(
  fields: IntakeFieldRow[],
  conditions: IntakeVisibilityCondition[],
  rawResponses: unknown
): { ok: true; responses: IntakeResponseMap } | { ok: false; error: string; status?: number } {
  if (typeof rawResponses !== 'object' || rawResponses === null || Array.isArray(rawResponses)) {
    return { ok: false, error: 'responses must be a JSON object.', status: 400 }
  }

  const incoming = rawResponses as Record<string, unknown>
  if (Object.keys(incoming).length > MAX_RESPONSE_KEYS) {
    return { ok: false, error: 'Too many keys in responses.', status: 400 }
  }

  const responses: IntakeResponseMap = {}

  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(incoming, field.field_name)) {
      continue
    }
    const coerced = coerceValue(field, incoming[field.field_name])
    if (!coerced.ok) {
      return { ok: false, error: coerced.message, status: 400 }
    }
    responses[field.field_name] = coerced.value
  }

  const fieldNames = fields.map((f) => f.field_name)
  const responseMap: Record<string, IntakeTriggerValue> = {}
  for (const [k, v] of Object.entries(responses)) {
    responseMap[k] = v as IntakeTriggerValue
  }

  const visible = computeVisibleIntakeFieldNames(fieldNames, conditions, responseMap)

  const validationError = validateIntakeResponses(fields, responses, visible)
  if (validationError) {
    return { ok: false, error: validationError, status: 400 }
  }

  return { ok: true, responses: pickVisibleIntakeResponses(responses, visible) }
}
