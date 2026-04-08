import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth/api';
import type { MessageRow } from '@/types/messaging';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context';

function getUserDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string }): string {
  const first = user.user_metadata?.first_name;
  const last = user.user_metadata?.last_name;
  if (typeof first === 'string' && typeof last === 'string' && first && last) return `${first} ${last}`;
  if (typeof first === 'string' && first) return first;
  if (typeof user.email === 'string' && user.email) return user.email;
  return 'User';
}

function toMessageRow(input: Record<string, unknown>): MessageRow {
  return {
    id: String(input.id ?? ''),
    conversation_id: String(input.conversation_id ?? ''),
    sender_id: String(input.sender_id ?? ''),
    sender_name: String(input.sender_name ?? ''),
    content: String(input.content ?? ''),
    is_from_user: Boolean(input.is_from_user),
    read: Boolean(input.read),
    created_at: String(input.created_at ?? ''),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient();
  const { user, errorResponse } = await requireAuthenticatedUser(supabase);
  if (errorResponse) return errorResponse;

  const { conversationId } = await params;

  try {
    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
    const isInternal = isInternalStaff(platformRole);

    if (isInternal && selectedWorkspaceId) {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('project_id')
        .eq('id', conversationId)
        .single();
      if (conversationError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', conversation.project_id)
        .single();
      if (projectError || !project || project.workspace_id !== selectedWorkspaceId) {
        return NextResponse.json(
          { error: 'Conversation is outside selected client context' },
          { status: 403 }
        );
      }
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, sender_name, content, is_from_user, read, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // RLS should already ensure tenant safety for both customers and consultants.
    return NextResponse.json(
      { messages: (messages ?? []).map(toMessageRow), currentUserId: user.id },
      { status: 200 }
    );
  } catch (e) {
    console.error('[messages] GET failed:', e);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient();
  const { user, errorResponse } = await requireAuthenticatedUser(supabase);
  if (errorResponse) return errorResponse;

  const { conversationId } = await params;

  const body = await request.json();
  const content = body?.content;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const trimmed = content.trim().slice(0, 4000);

  try {
    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
    const isInternal = isInternalStaff(platformRole);

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, user_id, project_id')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (isInternal) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', conversation.project_id)
        .single();

      if (projectError || !project || !project.workspace_id) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      if (selectedWorkspaceId && project.workspace_id !== selectedWorkspaceId) {
        return NextResponse.json(
          { error: 'Project is outside selected client context' },
          { status: 403 }
        );
      }
    }

    const isFromCustomer = conversation.user_id === user.id;

    const senderName = getUserDisplayName(user);

    const { data: created, error: createError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: senderName,
        content: trimmed,
        is_from_user: isFromCustomer,
        read: false,
      })
      .select('id, conversation_id, sender_id, sender_name, content, is_from_user, read, created_at')
      .single();

    if (createError) throw createError;

    // Keep the conversation preview up to date.
    await supabase
      .from('conversations')
      .update({
        last_message: trimmed,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return NextResponse.json({ message: toMessageRow(created) }, { status: 201 });
  } catch (e) {
    console.error('[messages] POST failed:', e);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

