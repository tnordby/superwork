import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCustomerWorkspaceContext } from '@/lib/account/customer-workspace-context';
import { validateTeamBelongsToWorkspace } from '@/lib/account/validate-workspace-team';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';
import {
  readSelectedWorkspaceIdFromRequest,
  resolveInternalWriteWorkspaceId,
} from '@/lib/internal/client-context';
import { tryCreateServiceRoleClient } from '@/lib/supabase/admin';

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

    let query;
    if (isInternalStaff(platformRole)) {
      if (!selectedWorkspaceId) {
        return NextResponse.json(
          { error: 'Select a client context before listing projects.' },
          { status: 400 }
        );
      }
      query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('workspace_id', selectedWorkspaceId);
    } else {
      query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .eq('user_id', user.id);
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
    const { name, description, category, service_type, service_template_id, workspace_id, team_id } =
      body;

    if (!name || !category || !service_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, service_type' },
        { status: 400 }
      );
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);

    let workspaceId: string | null = null;
    if (isInternalStaff(platformRole)) {
      const explicitWorkspaceId =
        typeof workspace_id === 'string' && workspace_id.trim() ? workspace_id.trim() : null;
      const resolved = resolveInternalWriteWorkspaceId({
        platformRole,
        selectedWorkspaceId,
        explicitWorkspaceId,
      });
      if (resolved.error) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }
      workspaceId = resolved.workspaceId;
      const { data: workspaceInContext } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('type', 'client')
        .maybeSingle();
      if (!workspaceInContext) {
        return NextResponse.json({ error: 'Client workspace not found' }, { status: 400 });
      }
      const requestedTeamId =
        typeof team_id === 'string' && team_id.trim() ? team_id.trim() : null;
      const admin = tryCreateServiceRoleClient();
      if (requestedTeamId && workspaceId && !admin) {
        return NextResponse.json(
          { error: 'Server configuration prevents validating team assignment.' },
          { status: 503 }
        );
      }
      if (requestedTeamId && workspaceId && admin) {
        const v = await validateTeamBelongsToWorkspace(admin, requestedTeamId, workspaceId);
        if (!v.ok) {
          return NextResponse.json({ error: v.message }, { status: 400 });
        }
      }

      const projectData: Record<string, unknown> = {
        user_id: user.id,
        workspace_id: workspaceId,
        name,
        description: description || null,
        category,
        service_type,
        status: 'planned',
        progress: 0,
      };
      if (requestedTeamId) {
        projectData.team_id = requestedTeamId;
      }
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

      if (service_template_id && project) {
        try {
          await supabase.rpc('instantiate_project_from_template', {
            project_id_param: project.id,
            service_template_id_param: service_template_id,
          });
        } catch (instantiateError) {
          console.error('Error instantiating project from template:', instantiateError);
        }
      }

      return NextResponse.json({ project }, { status: 201 });
    }

    const ctx = await resolveCustomerWorkspaceContext(user.id);
    if ('error' in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { workspace, admin } = ctx;
    const requestedTeamId = typeof team_id === 'string' && team_id.trim() ? team_id.trim() : null;
    if (requestedTeamId) {
      const v = await validateTeamBelongsToWorkspace(admin, requestedTeamId, workspace.id);
      if (!v.ok) {
        return NextResponse.json({ error: v.message }, { status: 400 });
      }
    }

    const projectData: Record<string, unknown> = {
      user_id: user.id,
      workspace_id: workspace.id,
      name,
      description: description || null,
      category,
      service_type,
      status: 'planned',
      progress: 0,
    };
    if (requestedTeamId) {
      projectData.team_id = requestedTeamId;
    }
    if (service_template_id) {
      projectData.service_template_id = service_template_id;
    }

    const { data: project, error } = await admin.from('projects').insert(projectData).select().single();

    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (service_template_id && project) {
      try {
        await admin.rpc('instantiate_project_from_template', {
          project_id_param: project.id,
          service_template_id_param: service_template_id,
        });
      } catch (instantiateError) {
        console.error('Error instantiating project from template:', instantiateError);
      }
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error in create project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
