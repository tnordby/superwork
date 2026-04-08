import { describe, expect, it } from 'vitest';
import { DEFAULT_TEAM_CONTACT_NAME } from '@/lib/messaging/constants';
import { checkCustomerConsultantName } from '@/lib/messaging/conversation-rules';

describe('checkCustomerConsultantName', () => {
  it('allows matching assignee', () => {
    expect(checkCustomerConsultantName('Jane Doe', 'Jane Doe')).toEqual({ allowed: true });
  });

  it('rejects wrong assignee', () => {
    const r = checkCustomerConsultantName('Other', 'Jane Doe');
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.status).toBe(403);
      expect(r.message).toContain('assigned');
    }
  });

  it('allows team label when no assignee', () => {
    expect(checkCustomerConsultantName(DEFAULT_TEAM_CONTACT_NAME, null)).toEqual({ allowed: true });
  });

  it('rejects arbitrary name when no assignee', () => {
    const r = checkCustomerConsultantName('Someone', null);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.status).toBe(400);
  });

  it('treats whitespace-only assignee as no assignee', () => {
    expect(checkCustomerConsultantName(DEFAULT_TEAM_CONTACT_NAME, '   ')).toEqual({ allowed: true });
  });
});
