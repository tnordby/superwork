/** RFC 4122 UUID string (any version/variant). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidString(value: string): boolean {
  return typeof value === 'string' && value.length === 36 && UUID_RE.test(value)
}
