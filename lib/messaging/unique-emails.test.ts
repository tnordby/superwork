import { describe, expect, it } from 'vitest';
import { uniqueEmailsPreservingCase } from '@/lib/messaging/unique-emails';

describe('uniqueEmailsPreservingCase', () => {
  it('dedupes case-insensitively and keeps first casing', () => {
    expect(uniqueEmailsPreservingCase(['A@x.com', 'a@x.com', 'B@y.com'])).toEqual(['A@x.com', 'B@y.com']);
  });

  it('trims and skips empties', () => {
    expect(uniqueEmailsPreservingCase(['  a@x.com  ', '', '   '])).toEqual(['a@x.com']);
  });
});
