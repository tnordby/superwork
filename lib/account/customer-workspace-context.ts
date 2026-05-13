import { isInternalStaff, type PlatformRole } from '@/lib/auth/platform-role';
import { tryCreateServiceRoleClient } from '@/lib/supabase/admin';

export type WorkspaceMembershipRole = 'owner' | 'admin' | 'member' | 'consultant' | 'client' | 'viewer';

export type CustomerWorkspaceRow = {
  id: string;
  owner_id: string;
  name: string;
};

export type CustomerWorkspaceContext =
  | {
      workspace: CustomerWorkspaceRow;
      actorRole: WorkspaceMembershipRole | 'owner';
      isOwner: boolean;
      canManageMembers: boolean;
      admin: NonNullable<ReturnType<typeof tryCreateServiceRoleClient>>;
    }
  | { error: string; status: 404 | 500 | 503 };

/** Owner or workspace admin/owner role may start checkout and change subscription capacity. */
export function customerCanManageBilling(
  ctx: Extract<CustomerWorkspaceContext, { workspace: CustomerWorkspaceRow }>
): boolean {
  return ctx.isOwner || ctx.actorRole === 'admin' || ctx.actorRole === 'owner';
}

/**
 * Resolves the authenticated customer's primary client workspace (owned or first membership).
 * Used by account APIs (members, teams, etc.).
 */
export async function resolveCustomerWorkspaceContext(userId: string): Promise<CustomerWorkspaceContext> {
  const admin = tryCreateServiceRoleClient();
  if (!admin) {
    return {
      error:
        'Server is missing SUPABASE_SERVICE_ROLE_KEY (and/or NEXT_PUBLIC_SUPABASE_URL). Add the service role secret from Supabase → Project Settings → API to your environment (e.g. .env.local). Account APIs need it to resolve your workspace safely.',
      status: 503,
    };
  }

  const { data: ownedWorkspace, error: ownedError } = await admin
    .from('workspaces')
    .select('id, owner_id, name')
    .eq('owner_id', userId)
    .eq('type', 'client')
    .order('created_at', { ascending: true })
    .maybeSingle();

  if (ownedError) {
    return { error: ownedError.message, status: 500 };
  }

  if (ownedWorkspace) {
    return {
      workspace: ownedWorkspace,
      actorRole: 'owner',
      isOwner: true,
      canManageMembers: true,
      admin,
    };
  }

  const { data: memberWorkspace, error: memberError } = await admin
    .from('workspace_members')
    .select('workspace_id, role, workspaces!inner(id, owner_id, name, type)')
    .eq('user_id', userId)
    .eq('workspaces.type', 'client')
    .order('invited_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) {
    return { error: memberError.message, status: 500 };
  }

  if (!memberWorkspace || !memberWorkspace.workspaces) {
    return { error: 'Workspace not found', status: 404 };
  }

  const workspace = Array.isArray(memberWorkspace.workspaces)
    ? memberWorkspace.workspaces[0]
    : memberWorkspace.workspaces;

  const actorRole = (memberWorkspace.role || 'member') as WorkspaceMembershipRole;
  const canManageMembers = actorRole === 'owner' || actorRole === 'admin';

  return {
    workspace,
    actorRole,
    isOwner: false,
    canManageMembers,
    admin,
  };
}

/**
 * Account/teams APIs use {@link resolveCustomerWorkspaceContext}. Internal-only accounts often have no
 * client workspace row—return 403 with a clear message instead of a generic 404.
 */
export function teamsApiErrorForContext(
  err: { error: string; status: 404 | 500 | 503 },
  platformRole: PlatformRole
): { error: string; status: 403 | 404 | 500 | 503 } {
  if (err.status === 404 && isInternalStaff(platformRole)) {
    return {
      error:
        'Teams and member budgets are part of a customer workspace. This account is not a member of a client workspace—use the customer portal as an admin, or ask the client to invite you.',
      status: 403,
    };
  }
  return err;
}
