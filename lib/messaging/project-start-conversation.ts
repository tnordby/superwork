import { DEFAULT_TEAM_CONTACT_NAME } from '@/lib/messaging/constants';
import { createServiceRoleClient } from '@/lib/supabase/admin';

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

function displayNameFromProfile(p: ProfileRow): string {
  const fn = p.first_name?.trim() || '';
  const ln = p.last_name?.trim() || '';
  if (fn || ln) return `${fn} ${ln}`.trim();
  const email = p.email?.trim() || '';
  return email || 'Team member';
}

export function getInitialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  const initials = `${first}${second}`.toUpperCase();
  return initials || '??';
}

/**
 * Builds primary contact + participant list for a project thread (customer-facing names).
 * Exported for unit tests.
 */
export function buildStartConversationParticipants(args: {
  assigneeText: string | null;
  quoteReviewedByUserId: string | null;
  quoteAssignedLeadUserId: string | null;
  assignmentUserIds: string[];
  profileByUserId: Map<string, ProfileRow>;
}): { consultant_name: string; participant_names: string[]; consultant_initials: string } {
  const assignee = args.assigneeText?.trim() || null;

  const orderedIds: string[] = [];
  const pushId = (id: string | null | undefined) => {
    if (!id) return;
    if (!orderedIds.includes(id)) orderedIds.push(id);
  };

  pushId(args.quoteReviewedByUserId);
  pushId(args.quoteAssignedLeadUserId);
  for (const id of args.assignmentUserIds) {
    pushId(id);
  }

  const nameByUserId = new Map<string, string>();
  for (const id of orderedIds) {
    const p = args.profileByUserId.get(id);
    if (p) nameByUserId.set(id, displayNameFromProfile(p));
  }

  const leadName =
    (args.quoteAssignedLeadUserId && nameByUserId.get(args.quoteAssignedLeadUserId)) ||
    (args.assignmentUserIds[0] ? nameByUserId.get(args.assignmentUserIds[0]) : undefined) ||
    null;

  const consultant_name = assignee || leadName || DEFAULT_TEAM_CONTACT_NAME;

  const pmName =
    (args.quoteReviewedByUserId && nameByUserId.get(args.quoteReviewedByUserId)) || null;

  const participant_names: string[] = [];
  const seen = new Set<string>();
  const addName = (n: string | null | undefined) => {
    const t = typeof n === 'string' ? n.trim() : '';
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    participant_names.push(t);
  };

  addName(consultant_name);
  addName(pmName);

  for (const id of orderedIds) {
    addName(nameByUserId.get(id));
  }

  if (participant_names.length === 0) {
    participant_names.push(DEFAULT_TEAM_CONTACT_NAME);
  }

  return {
    consultant_name,
    participant_names,
    consultant_initials: getInitialsFromDisplayName(consultant_name),
  };
}

/**
 * When a project moves into a started status, ensure the customer has a default inbox thread
 * with their PM (quote reviewer) and delivery team (assignee + assignments) on the participant list.
 * Best-effort: failures are logged; does not throw.
 */
export async function ensureConversationWhenProjectStarts(
  projectId: string,
  project: { user_id: string; assignee: string | null }
): Promise<void> {
  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    console.warn(
      '[ensureConversationWhenProjectStarts] SUPABASE_SERVICE_ROLE_KEY missing; skip auto-conversation'
    );
    return;
  }

  try {
    const customerUserId = project.user_id;
    if (!customerUserId || !projectId) return;

    const { data: existing, error: existingError } = await admin
      .from('conversations')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', customerUserId)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('[ensureConversationWhenProjectStarts] existing check failed:', existingError);
      return;
    }
    if (existing) return;

    const { data: quoteRow } = await admin
      .from('quotes')
      .select('reviewed_by_user_id, assigned_lead_user_id')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const quoteReviewedByUserId =
      typeof quoteRow?.reviewed_by_user_id === 'string' ? quoteRow.reviewed_by_user_id : null;
    const quoteAssignedLeadUserId =
      typeof quoteRow?.assigned_lead_user_id === 'string' ? quoteRow.assigned_lead_user_id : null;

    const { data: assignmentRows, error: assignmentError } = await admin
      .from('project_assignments')
      .select('user_id, role')
      .eq('project_id', projectId)
      .is('removed_at', null);

    if (assignmentError) {
      console.error('[ensureConversationWhenProjectStarts] assignments failed:', assignmentError);
      return;
    }

    const sortedAssignments = [...(assignmentRows ?? [])].sort((a, b) => {
      if (a.role === 'lead' && b.role !== 'lead') return -1;
      if (b.role === 'lead' && a.role !== 'lead') return 1;
      return 0;
    });

    const assignmentUserIds = sortedAssignments
      .map((r) => (typeof r.user_id === 'string' ? r.user_id : ''))
      .filter(Boolean);

    const profileIds = Array.from(
      new Set(
        [quoteReviewedByUserId, quoteAssignedLeadUserId, ...assignmentUserIds].filter(
          (id): id is string => Boolean(id)
        )
      )
    );

    const profileByUserId = new Map<string, ProfileRow>();
    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', profileIds);

      if (profilesError) {
        console.error('[ensureConversationWhenProjectStarts] profiles failed:', profilesError);
        return;
      }
      for (const row of profiles ?? []) {
        if (row && typeof row.id === 'string') {
          profileByUserId.set(row.id, row as ProfileRow);
        }
      }
    }

    const { consultant_name, participant_names, consultant_initials } =
      buildStartConversationParticipants({
        assigneeText: project.assignee,
        quoteReviewedByUserId,
        quoteAssignedLeadUserId,
        assignmentUserIds,
        profileByUserId,
      });

    const { error: insertError } = await admin.from('conversations').insert({
      project_id: projectId,
      user_id: customerUserId,
      consultant_name,
      participant_names,
      consultant_initials,
    });

    if (insertError) {
      console.error('[ensureConversationWhenProjectStarts] insert failed:', insertError);
    }
  } catch (e) {
    console.error('[ensureConversationWhenProjectStarts] unexpected:', e);
  }
}
