import { describe, expect, it } from 'vitest'
import { readJsonWithLimit } from '@/lib/api/read-json-body'

describe('readJsonWithLimit', () => {
  it('parses valid JSON', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: '{"a":1}',
      headers: { 'content-type': 'application/json' },
    })
    const r = await readJsonWithLimit(req, 1024)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual({ a: 1 })
  })

  it('rejects when content-length exceeds limit', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: '{}',
      headers: { 'content-length': '99999999' },
    })
    const r = await readJsonWithLimit(req, 100)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(413)
  })
})
