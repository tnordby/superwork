/** PostgREST `.or()` splits on commas; LIKE treats `%`/`_` as wildcards — normalize for safe filters. */
export function sanitizeAssetSearchInput(raw: string): string {
  return raw
    .replace(/,/g, ' ')
    .replace(/%/g, '')
    .replace(/_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
