/** Default cap for JSON API bodies (intake, small payloads). */
export const DEFAULT_MAX_JSON_BYTES = 512 * 1024

export type ReadJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; status: number; error: string }

/**
 * Reads and parses JSON with a byte limit to reduce abuse (large bodies / parse bombs).
 * Prefer over `request.json()` for authenticated write endpoints.
 */
export async function readJsonWithLimit(
  request: Request,
  maxBytes: number = DEFAULT_MAX_JSON_BYTES
): Promise<ReadJsonResult> {
  const contentLength = request.headers.get('content-length')
  if (contentLength !== null) {
    const n = Number(contentLength)
    if (Number.isFinite(n) && n > maxBytes) {
      return { ok: false, status: 413, error: 'Request body too large' }
    }
  }

  let text: string
  try {
    text = await request.text()
  } catch {
    return { ok: false, status: 400, error: 'Could not read body' }
  }

  if (text.length > maxBytes) {
    return { ok: false, status: 413, error: 'Request body too large' }
  }

  if (text.trim() === '') {
    return { ok: false, status: 400, error: 'Empty body' }
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' }
  }
}
