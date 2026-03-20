import { isInternalStaff, normalizePlatformRole } from '@/lib/auth/platform-role';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export interface QuoteAssigneeValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validates whether a user can be assigned as quote lead.
 * Security-critical: only internal staff may be assigned.
 */
export async function validateQuoteAssignee(
  userId: string
): Promise<QuoteAssigneeValidationResult> {
  const admin = createServiceRoleClient();

  const { data: authUserResponse, error: authUserError } =
    await admin.auth.admin.getUserById(userId);
  if (authUserError || !authUserResponse?.user) {
    return { ok: false, reason: 'Assignee user not found' };
  }

  const { data: roleRow, error: roleError } = await admin
    .from('user_platform_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) {
    return { ok: false, reason: 'Failed to validate assignee role' };
  }

  const role = normalizePlatformRole(
    roleRow?.role ?? authUserResponse.user.user_metadata?.role
  );

  if (!isInternalStaff(role)) {
    return {
      ok: false,
      reason:
        'Assigned lead must be internal staff (consultant, project manager, or admin)',
    };
  }

  return { ok: true };
}

