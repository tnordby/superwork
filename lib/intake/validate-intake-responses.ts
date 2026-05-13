/** JSON-serializable intake values (aligned with DynamicIntakeForm). */
export type IntakeResponseMap = Record<string, string | number | boolean | string[] | undefined>

export type IntakeFieldForValidation = {
  field_name: string
  field_type: string
  label: string
  is_required: boolean
}

function isValuePresent(fieldType: string, value: IntakeResponseMap[string]): boolean {
  if (value === undefined || value === null) return false
  if (fieldType === 'multiselect') {
    return Array.isArray(value) && value.length > 0
  }
  if (fieldType === 'checkbox') {
    return value === true
  }
  if (typeof value === 'number') {
    return !Number.isNaN(value)
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    return value.trim() !== ''
  }
  return false
}

/** Returns an error message if any visible required field is empty; otherwise null. */
export function validateIntakeResponses(
  fields: IntakeFieldForValidation[],
  responses: IntakeResponseMap,
  visibleFieldNames: Set<string>
): string | null {
  for (const field of fields) {
    if (!field.is_required || !visibleFieldNames.has(field.field_name)) continue
    if (!isValuePresent(field.field_type, responses[field.field_name])) {
      return `${field.label} is required.`
    }
  }
  return null
}

/** Keeps only responses for fields that are currently visible (avoids persisting hidden conditional answers). */
export function pickVisibleIntakeResponses(
  responses: IntakeResponseMap,
  visibleFieldNames: Set<string>
): IntakeResponseMap {
  const out: IntakeResponseMap = {}
  for (const name of visibleFieldNames) {
    if (Object.prototype.hasOwnProperty.call(responses, name)) {
      out[name] = responses[name]
    }
  }
  return out
}
