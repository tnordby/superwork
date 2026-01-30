import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get single service template with SOPs and tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch service template
    const { data: template, error: templateError } = await supabase
      .from('service_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (templateError || !template) {
      console.error('Error fetching template:', templateError);
      console.error('Template ID:', id);
      return NextResponse.json({ error: 'Service template not found', details: templateError }, { status: 404 });
    }

    // Fetch SOPs for this template
    const { data: sops, error: sopsError } = await supabase
      .from('service_sops')
      .select('*')
      .eq('service_template_id', id)
      .order('order_index', { ascending: true });

    if (sopsError) {
      console.error('Error fetching SOPs:', sopsError);
      console.error('Full error details:', JSON.stringify(sopsError));
      return NextResponse.json({ error: sopsError.message, details: sopsError }, { status: 500 });
    }

    // Fetch tasks for each SOP
    const sopsWithTasks = await Promise.all(
      (sops || []).map(async (sop) => {
        const { data: tasks } = await supabase
          .from('sop_tasks')
          .select('*')
          .eq('sop_id', sop.id)
          .order('order_index', { ascending: true });

        return {
          ...sop,
          tasks: tasks || [],
        };
      })
    );

    const response = {
      template: {
        ...template,
        sops: sopsWithTasks,
      },
    };

    console.log('Returning template response:', JSON.stringify(response).substring(0, 500));

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error in service API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update service template (admin only)
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

    // Check if user is admin
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update service templates' }, { status: 403 });
    }

    const body = await request.json();

    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.customer_description !== undefined)
      updateData.customer_description = body.customer_description;
    if (body.estimated_hours !== undefined) updateData.estimated_hours = body.estimated_hours;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: template, error: updateError } = await supabase
      .from('service_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating service template:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    console.error('Error in service API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete service template (admin only)
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

    // Check if user is admin
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete service templates' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('service_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting service template:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in service API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
