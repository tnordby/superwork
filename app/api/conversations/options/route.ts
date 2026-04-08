import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth/api';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { hasFullMessagingAccess, isConsultant, isInternalStaff } from '@/lib/auth/platform-role';
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context';
import { DEFAULT_TEAM_CONTACT_NAME } from '@/lib/messaging/constants';

function getInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  const initials = `${first}${second}`.toUpperCase();
  return initials || '??';
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { user, errorResponse } = await requireAuthenticatedUser(supabase);
  if (errorResponse) return errorResponse;

  const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  const isMessagingConsultant = isConsultant(platformRole);
  const isAdminOrPm = hasFullMessagingAccess(platformRole);
  const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);

  try {
    // Threads are project-scoped. Customers see their projects (with or without a named assignee).
    // Consultants see assigned projects. Admin/PM see projects in the selected workspace (or all).
    let projectsQuery = supabase
      .from('projects')
      .select('id, name, assignee, workspace_id')
      .order('updated_at', { ascending: false });

    if (isInternalStaff(platformRole) && selectedWorkspaceId) {
      projectsQuery = projectsQuery.eq('workspace_id', selectedWorkspaceId);
    }

    if (!isAdminOrPm) {
      if (isMessagingConsultant) {
        const { data: assignments, error: assignmentError } = await supabase
          .from('project_assignments')
          .select('project_id')
          .eq('user_id', user.id)
          .is('removed_at', null);

        if (assignmentError) throw assignmentError;
        const projectIds = (assignments ?? []).map((a) => a.project_id).filter(Boolean);
        if (projectIds.length === 0) {
          return NextResponse.json({ options: [] }, { status: 200 });
        }
        projectsQuery = projectsQuery.in('id', projectIds);
      } else {
        projectsQuery = projectsQuery.eq('user_id', user.id);
      }
    }

    const { data: projects, error } = await projectsQuery;
    if (error) throw error;

    const options = (projects ?? []).map((project) => {
      const assignee = typeof project.assignee === 'string' && project.assignee.trim() ? project.assignee.trim() : null;
      const contactName = assignee ?? DEFAULT_TEAM_CONTACT_NAME;
      return {
        projectId: project.id as string,
        projectName: (project.name as string) ?? 'Project',
        contacts: [
          {
            name: contactName,
            initials: getInitialsFromName(contactName),
          },
        ],
      };
    });

    return NextResponse.json({ options }, { status: 200 });
  } catch (e) {
    console.error('[conversations/options] GET failed:', e);
    return NextResponse.json({ error: 'Failed to load conversation options' }, { status: 500 });
  }
}

