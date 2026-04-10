import { describe, expect, it } from 'vitest';
import { sanitizeAssetSearchInput } from './asset-query';

describe('sanitizeAssetSearchInput', () => {
  it('removes comma, percent, and underscore (SQL LIKE wildcards / PostgREST or-split)', () => {
    expect(sanitizeAssetSearchInput('a,b%c_d')).toBe('a bcd');
  });

  it('collapses whitespace and trims', () => {
    expect(sanitizeAssetSearchInput('  hello   world  ')).toBe('hello world');
  });
});
