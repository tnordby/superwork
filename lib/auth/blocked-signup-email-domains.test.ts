import { describe, expect, it } from 'vitest';
import {
  isBlockedSignupEmailDomain,
  signupEmailDomain,
} from './blocked-signup-email-domains';

describe('signupEmailDomain', () => {
  it('returns lowercased domain', () => {
    expect(signupEmailDomain('Jane@Example.COM')).toBe('example.com');
  });

  it('returns null for invalid input', () => {
    expect(signupEmailDomain('not-an-email')).toBeNull();
    expect(signupEmailDomain('@')).toBeNull();
    expect(signupEmailDomain('')).toBeNull();
  });
});

describe('isBlockedSignupEmailDomain', () => {
  it('blocks common webmail', () => {
    expect(isBlockedSignupEmailDomain('a.b.c@gmail.com')).toBe(true);
    expect(isBlockedSignupEmailDomain('x@hotmail.com')).toBe(true);
    expect(isBlockedSignupEmailDomain('x@outlook.com')).toBe(true);
    expect(isBlockedSignupEmailDomain('x@icloud.com')).toBe(true);
  });

  it('allows corporate domains', () => {
    expect(isBlockedSignupEmailDomain('person@acme.com')).toBe(false);
    expect(isBlockedSignupEmailDomain('user@sub.client.co.uk')).toBe(false);
  });

  it('does not block domains that merely contain a substring', () => {
    expect(isBlockedSignupEmailDomain('ops@notgmail.com')).toBe(false);
  });
});
