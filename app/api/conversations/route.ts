import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth/api';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { hasFullMessagingAccess, isConsultant } from '@/lib/auth/platform-role';
import type { ConversationSummary } from '@/types/messaging';

function getInitialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  const initials = `${first}${second}`.toUpperCase();

  return initials || '??';
}

function toConversationSummary(input: any): ConversationSummary {
  const projectName =
    input.projects?.name ??
    (Array.isArray(input.projects) ? input.projects[0]?.name ?? null : null);

  return {
    id: input.id,
    project_id: input.project_id,
    project_name: projectName,
    consultant_name: input.consultant_name,
    participant_names: Array.isArray(input.participant_names)
      ? input.participant_names.filter((name: unknown) => typeof name === 'string' && name.trim().length > 0)
      : [],
    consultant_initials: input.consultant_initials,
    last_message: input.last_message ?? null,
    last_message_at: input.last_message_at ?? null,
    updated_at: input.updated_at,
  };
}

// GET - list conversations accessible by the current user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { user, errorResponse } = await requireAuthenticatedUser(supabase);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const consultantName = url.searchParams.get('consultantName');

  const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  const isMessagingConsultant = isConsultant(platformRole);
  const isAdminOrPm = hasFullMessagingAccess(platformRole);

  const select = `
    id,
    project_id,
    consultant_name,
    participant_names,
    consultant_initials,
    last_message,
    last_message_at,
    updated_at,
    projects(name)
  `;

  try {
    let query = supabase.from('conversations').select(select);

    if (projectId) query = query.eq('project_id', projectId);
    if (consultantName) query = query.eq('consultant_name', consultantName);

    if (!isAdminOrPm) {
      if (isMessagingConsultant) {
        // Limit to projects assigned to this consultant
        const { data: assignments, error: assignmentError } = await supabase
          .from('project_assignments')
          .select('project_id')
          .eq('user_id', user.id)
          .is('removed_at', null);

        if (assignmentError) throw assignmentError;

        const projectIds = (assignments ?? []).map((a) => a.project_id).filter(Boolean);
        if (projectIds.length === 0) {
          return NextResponse.json({ conversations: [] }, { status: 200 });
        }

        if (projectId && !projectIds.includes(projectId)) {
          return NextResponse.json({ conversations: [] }, { status: 200 });
        }

        query = query.in('project_id', projectIds);
      } else {
        // Treat everyone else as a customer (RLS should also enforce this)
        query = query.eq('user_id', user.id);
      }
    }

    const { data, error } = await query.order('last_message_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json(
      {
        conversations: (data ?? []).map(toConversationSummary),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('[conversations] GET failed:', e);
    const details =
      e instanceof Error
        ? e.message
        : typeof e === 'string'
          ? e
          : typeof e === 'object' && e && 'message' in e
            ? String((e as any).message)
            : JSON.stringify(e);
    return NextResponse.json(
      {
        error: 'Failed to load conversations',
        ...(process.env.NODE_ENV !== 'production' ? { details } : {}),
      },
      { status: 500 }
    );
  }
}

// POST - get or create a conversation for a project
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, errorResponse } = await requireAuthenticatedUser(supabase);
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const projectId = body?.projectId;
  const consultantName = body?.consultantName;
  const participantNamesInput = Array.isArray(body?.participantNames) ? body.participantNames : [];

  if (typeof projectId !== 'string' || !projectId || typeof consultantName !== 'string' || !consultantName) {
    return NextResponse.json(
      { error: 'projectId and consultantName are required' },
      { status: 400 }
    );
  }

  const participantNames = Array.from(
    new Set(
      [consultantName, ...participantNamesInput]
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );

  const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  const isMessagingConsultant = isConsultant(platformRole);
  const isAdminOrPm = hasFullMessagingAccess(platformRole);

  try {
    // Derive the customer (conversation.user_id) from the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, assignee')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const customerUserId = project.user_id as string;
    const projectAssignee = (project.assignee as string | null) ?? null;

    // Access check: customer owns the project, consultant is assigned, or admin/pm
    if (!isAdminOrPm) {
      if (!isMessagingConsultant) {
        if (customerUserId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // Customers may only start a conversation with the assigned contact for that project.
        if (!projectAssignee) {
          return NextResponse.json(
            { error: 'This project has no assigned consultant yet' },
            { status: 400 }
          );
        }
        if (consultantName !== projectAssignee) {
          return NextResponse.json(
            { error: 'You can only message the contact assigned to this project' },
            { status: 403 }
          );
        }
      } else {
        const { data: assignment, error: assignmentError } = await supabase
          .from('project_assignments')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .is('removed_at', null)
          .maybeSingle();

        if (assignmentError) throw assignmentError;
        if (!assignment) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    const consultantInitials = typeof body?.consultantInitials === 'string' && body.consultantInitials
      ? body.consultantInitials
      : getInitialsFromName(consultantName);

    // Try existing conversation first
    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('id, project_id, consultant_name, participant_names, consultant_initials, last_message, last_message_at, updated_at, projects(name)')
      .eq('project_id', projectId)
      .eq('user_id', customerUserId)
      .eq('consultant_name', consultantName)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return NextResponse.json({ conversation: toConversationSummary(existing) }, { status: 200 });
    }

    // Fallback: if consultant_name changed, still reuse the most recent thread for the project/customer
    const { data: existingAny, error: existingAnyError } = await supabase
      .from('conversations')
      .select('id, project_id, consultant_name, participant_names, consultant_initials, last_message, last_message_at, updated_at, projects(name)')
      .eq('project_id', projectId)
      .eq('user_id', customerUserId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAnyError) throw existingAnyError;
    if (existingAny) {
      // Update consultant naming to keep UI stable going forward.
      await supabase
        .from('conversations')
        .update({
          consultant_name: consultantName,
          participant_names: participantNames,
          consultant_initials: consultantInitials,
        })
        .eq('id', existingAny.id);

      return NextResponse.json({ conversation: toConversationSummary(existingAny) }, { status: 200 });
    }

    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({
        project_id: projectId,
        user_id: customerUserId,
        consultant_name: consultantName,
        participant_names: participantNames,
        consultant_initials: consultantInitials,
      })
      .select('id, project_id, consultant_name, participant_names, consultant_initials, last_message, last_message_at, updated_at, projects(name)')
      .single();

    if (createError) throw createError;

    return NextResponse.json({ conversation: toConversationSummary(created) }, { status: 201 });
  } catch (e) {
    console.error('[conversations] POST failed:', e);
    const details =
      e instanceof Error
        ? e.message
        : typeof e === 'string'
          ? e
          : typeof e === 'object' && e && 'message' in e
            ? String((e as any).message)
            : JSON.stringify(e);
    return NextResponse.json(
      {
        error: 'Failed to create conversation',
        ...(process.env.NODE_ENV !== 'production' ? { details } : {}),
      },
      { status: 500 }
    );
  }
}

