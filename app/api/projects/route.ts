import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectInsert } from '@/types/projects';

// GET - Fetch all projects for the logged-in user
export async function GET() {
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

    // Fetch projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

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

    // Create project
    const projectData: any = {
      user_id: user.id,
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
