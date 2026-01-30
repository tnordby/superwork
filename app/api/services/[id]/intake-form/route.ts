import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    // Fetch intake form fields
    console.log('Fetching intake form fields for service:', params.id)
    const { data: fields, error: fieldsError } = await supabase
      .from('intake_form_fields')
      .select('*')
      .eq('service_template_id', params.id)
      .order('order_index')

    console.log('Fields result:', { fields, error: fieldsError })

    if (fieldsError) {
      console.error('Error fetching intake form fields:', fieldsError)
      console.error('Error details:', JSON.stringify(fieldsError, null, 2))
      return NextResponse.json(
        { error: 'Failed to fetch intake form fields', details: fieldsError },
        { status: 500 }
      )
    }

    // Fetch conditional logic
    const { data: conditions, error: conditionsError } = await supabase
      .from('intake_form_conditions')
      .select('*')
      .eq('service_template_id', params.id)

    if (conditionsError) {
      console.error('Error fetching conditions:', conditionsError)
      return NextResponse.json(
        { error: 'Failed to fetch conditional logic' },
        { status: 500 }
      )
    }

    // Fetch service template info
    const { data: service, error: serviceError } = await supabase
      .from('service_templates')
      .select('name, category')
      .eq('id', params.id)
      .single()

    if (serviceError) {
      console.error('Error fetching service:', serviceError)
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      service,
      fields: fields || [],
      conditions: conditions || [],
    })
  } catch (error) {
    console.error('Error in intake form API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
