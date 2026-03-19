import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth/api';

function getInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  const initials = `${first}${second}`.toUpperCase();
  return initials || '??';
}

export async function GET() {
  const supabase = await createClient();
  const { user, errorResponse } = await requireAuthenticatedUser(supabase);
  if (errorResponse) return errorResponse;

  const userRole = user.user_metadata?.role;
  const isConsultant = userRole === 'consultant';
  const isAdminOrPm = userRole === 'admin' || userRole === 'pm';

  try {
    // For now, customer/consultant message threads are project-scoped.
    // Customers can start threads for their own projects.
    // Consultants see only projects assigned to them.
    // Admin/PM can see all projects with assignee.
    let projectsQuery = supabase
      .from('projects')
      .select('id, name, assignee')
      .not('assignee', 'is', null)
      .order('updated_at', { ascending: false });

    if (!isAdminOrPm) {
      if (isConsultant) {
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

    const options = (projects ?? []).map((project) => ({
      projectId: project.id as string,
      projectName: (project.name as string) ?? 'Project',
      contacts: [
        {
          name: project.assignee as string,
          initials: getInitialsFromName(project.assignee as string),
        },
      ],
    }));

    return NextResponse.json({ options }, { status: 200 });
  } catch (e) {
    console.error('[conversations/options] GET failed:', e);
    return NextResponse.json({ error: 'Failed to load conversation options' }, { status: 500 });
  }
}

