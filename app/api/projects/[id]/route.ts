import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectUpdate } from '@/types/projects';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';
import type { PlatformRole } from '@/lib/auth/platform-role';
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context';

async function loadProjectWithAccessScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  platformRole: PlatformRole,
  projectId: string,
  selectedWorkspaceId: string | null
) {
  let query = supabase.from('projects').select('*').eq('id', projectId);
  if (isInternalStaff(platformRole)) {
    if (selectedWorkspaceId) {
      query = query.eq('workspace_id', selectedWorkspaceId);
    }
  } else {
    query = query.eq('user_id', userId);
  }
  return query.single();
}

// GET - Fetch a single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);

    // Fetch project
    const { data: project, error } = await loadProjectWithAccessScope(
      supabase,
      user.id,
      platformRole,
      id,
      selectedWorkspaceId
    );

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      console.error('Error fetching project:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error('Error in get project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);

    // Parse request body
    const body = await request.json();
    const updateData: ProjectUpdate = {};

    // Only include fields that are present in the request
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      updateData.status = body.status;

      // Auto-update timestamps based on status
      if (body.status === 'in_progress' && !body.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      if (body.status === 'completed' && !body.completed_at) {
        updateData.completed_at = new Date().toISOString();
        updateData.progress = 100;
      }
    }
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.assignee !== undefined) updateData.assignee = body.assignee;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;

    const { data: existingProject, error: existingProjectError } = await loadProjectWithAccessScope(
      supabase,
      user.id,
      platformRole,
      id,
      selectedWorkspaceId
    );
    if (existingProjectError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project
    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error('Error in update project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);

    const { data: existingProject, error: existingProjectError } = await loadProjectWithAccessScope(
      supabase,
      user.id,
      platformRole,
      id,
      selectedWorkspaceId
    );
    if (existingProjectError || !existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in delete project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
