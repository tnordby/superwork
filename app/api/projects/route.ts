import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context';

// GET - Fetch all projects for the logged-in user
export async function GET(request: NextRequest) {
  try {
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

    // Fetch projects
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (isInternalStaff(platformRole)) {
      if (selectedWorkspaceId) {
        query = query.eq('workspace_id', selectedWorkspaceId);
      }
    } else {
      query = query.eq('user_id', user.id);
    }
    const { data: projects, error } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error('Error in projects API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new project
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, category, service_type, service_template_id } = body;

    if (!name || !category || !service_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, service_type' },
        { status: 400 }
      );
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);

    // Get workspace for project creation.
    // Internal users create under selected client context; customers under their own workspace.
    let workspaceId: string | null = null;
    if (isInternalStaff(platformRole) && selectedWorkspaceId) {
      const { data: workspaceInContext } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', selectedWorkspaceId)
        .eq('type', 'client')
        .maybeSingle();
      workspaceId = workspaceInContext?.id ?? null;
    } else {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      workspaceId = workspace?.id ?? null;
    }

    // Create project
    const projectData = {
      user_id: user.id,
      workspace_id: workspaceId,
      name,
      description: description || null,
      category,
      service_type,
      status: 'planned',
      progress: 0,
    };

    // Add service_template_id if provided
    if (service_template_id) {
      projectData.service_template_id = service_template_id;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If service_template_id is provided, instantiate SOPs and tasks
    if (service_template_id && project) {
      try {
        await supabase.rpc('instantiate_project_from_template', {
          project_id_param: project.id,
          service_template_id_param: service_template_id,
        });
      } catch (instantiateError) {
        console.error('Error instantiating project from template:', instantiateError);
        // Continue anyway - project is created, just without template tasks
      }
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error in create project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
