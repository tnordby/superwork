import { describe, expect, it } from 'vitest';
import { teamsApiErrorForContext } from './customer-workspace-context';

describe('teamsApiErrorForContext', () => {
  it('maps 404 to 403 for internal roles', () => {
    const out = teamsApiErrorForContext({ error: 'Workspace not found', status: 404 }, 'consultant');
    expect(out.status).toBe(403);
    expect(out.error).toContain('customer workspace');
  });

  it('leaves 404 for customers', () => {
    const out = teamsApiErrorForContext({ error: 'Workspace not found', status: 404 }, 'customer');
    expect(out).toEqual({ error: 'Workspace not found', status: 404 });
  });

  it('passes through 503', () => {
    const err = { error: 'missing key', status: 503 as const };
    expect(teamsApiErrorForContext(err, 'project_manager')).toEqual(err);
  });
});
