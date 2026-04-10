import { describe, expect, it } from 'vitest';
import { DEFAULT_TEAM_CONTACT_NAME } from '@/lib/messaging/constants';
import { buildStartConversationParticipants } from '@/lib/messaging/project-start-conversation';

function profile(
  id: string,
  partial: Partial<{ first_name: string; last_name: string; email: string }>
) {
  return {
    id,
    first_name: partial.first_name ?? null,
    last_name: partial.last_name ?? null,
    email: partial.email ?? null,
  };
}

describe('buildStartConversationParticipants', () => {
  it('uses assignee as primary when set', () => {
    const map = new Map([
      ['pm-1', profile('pm-1', { first_name: 'Pat', last_name: 'PM' })],
      ['lead-1', profile('lead-1', { first_name: 'Chris', last_name: 'Consultant' })],
    ]);
    const r = buildStartConversationParticipants({
      assigneeText: 'Chris Consultant',
      quoteReviewedByUserId: 'pm-1',
      quoteAssignedLeadUserId: 'lead-1',
      assignmentUserIds: ['lead-1'],
      profileByUserId: map,
    });
    expect(r.consultant_name).toBe('Chris Consultant');
    expect(r.participant_names).toContain('Chris Consultant');
    expect(r.participant_names).toContain('Pat PM');
    expect(r.consultant_initials).toBe('CC');
  });

  it('falls back to quote lead display name when no assignee', () => {
    const map = new Map([
      ['lead-1', profile('lead-1', { first_name: 'Alex', last_name: 'River' })],
    ]);
    const r = buildStartConversationParticipants({
      assigneeText: null,
      quoteReviewedByUserId: null,
      quoteAssignedLeadUserId: 'lead-1',
      assignmentUserIds: ['lead-1'],
      profileByUserId: map,
    });
    expect(r.consultant_name).toBe('Alex River');
    expect(r.participant_names[0]).toBe('Alex River');
  });

  it('uses default team label when nothing else is available', () => {
    const r = buildStartConversationParticipants({
      assigneeText: null,
      quoteReviewedByUserId: null,
      quoteAssignedLeadUserId: null,
      assignmentUserIds: [],
      profileByUserId: new Map(),
    });
    expect(r.consultant_name).toBe(DEFAULT_TEAM_CONTACT_NAME);
    expect(r.participant_names).toEqual([DEFAULT_TEAM_CONTACT_NAME]);
  });

  it('dedupes participant names case-insensitively', () => {
    const map = new Map([['u1', profile('u1', { first_name: 'Sam', last_name: 'Same' })]]);
    const r = buildStartConversationParticipants({
      assigneeText: 'sam same',
      quoteReviewedByUserId: 'u1',
      quoteAssignedLeadUserId: null,
      assignmentUserIds: ['u1'],
      profileByUserId: map,
    });
    expect(r.participant_names.length).toBe(1);
    expect(r.participant_names[0]).toBe('sam same');
  });
});
