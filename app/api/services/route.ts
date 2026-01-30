import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List all active service templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all active service templates
    const { data: templates, error } = await supabase
      .from('service_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching service templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in services API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new service template (admin only)
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

    // Check if user is admin
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create service templates' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.category || !body.customer_description) {
      return NextResponse.json(
        { error: 'name, category, and customer_description are required' },
        { status: 400 }
      );
    }

    // Create service template
    const { data: template, error: createError } = await supabase
      .from('service_templates')
      .insert({
        name: body.name,
        category: body.category,
        customer_description: body.customer_description,
        estimated_hours: body.estimated_hours,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating service template:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error in services API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
