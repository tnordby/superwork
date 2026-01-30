import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params
    const body = await request.json()

    const { serviceTemplateId, responses } = body

    if (!serviceTemplateId || !responses) {
      return NextResponse.json(
        { error: 'serviceTemplateId and responses are required' },
        { status: 400 }
      )
    }

    // Verify the project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', params.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if response already exists
    const { data: existing } = await supabase
      .from('project_intake_responses')
      .select('id')
      .eq('project_id', params.id)
      .single()

    if (existing) {
      // Update existing response
      const { data, error } = await supabase
        .from('project_intake_responses')
        .update({
          responses,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating intake response:', error)
        return NextResponse.json(
          { error: 'Failed to update intake response' },
          { status: 500 }
        )
      }

      return NextResponse.json(data)
    } else {
      // Create new response
      const { data, error } = await supabase
        .from('project_intake_responses')
        .insert({
          project_id: params.id,
          service_template_id: serviceTemplateId,
          responses,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating intake response:', error)
        return NextResponse.json(
          { error: 'Failed to save intake response' },
          { status: 500 }
        )
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Error in intake response API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    const { data, error } = await supabase
      .from('project_intake_responses')
      .select('*')
      .eq('project_id', params.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      console.error('Error fetching intake response:', error)
      return NextResponse.json(
        { error: 'Failed to fetch intake response' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || null)
  } catch (error) {
    console.error('Error in intake response API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
