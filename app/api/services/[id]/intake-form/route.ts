import { createClient } from '@/lib/supabase/server'
import { logIntakeRouteError } from '@/lib/observability/intake-server-log'
import { isUuidString } from '@/lib/validation/is-uuid'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    if (!isUuidString(params.id)) {
      return NextResponse.json({ error: 'Invalid service id' }, { status: 400 })
    }

    const { data: fields, error: fieldsError } = await supabase
      .from('intake_form_fields')
      .select('*')
      .eq('service_template_id', params.id)
      .order('order_index')

    if (fieldsError) {
      logIntakeRouteError('intake-form', 'fields_query', fieldsError, {
        serviceTemplateId: params.id,
      })
      return NextResponse.json({ error: 'Failed to fetch intake form fields' }, { status: 500 })
    }

    const { data: conditions, error: conditionsError } = await supabase
      .from('intake_form_conditions')
      .select('*')
      .eq('service_template_id', params.id)
      .order('order_index', { ascending: true })
      .order('id', { ascending: true })

    if (conditionsError) {
      logIntakeRouteError('intake-form', 'conditions_query', conditionsError, {
        serviceTemplateId: params.id,
      })
      return NextResponse.json({ error: 'Failed to fetch conditional logic' }, { status: 500 })
    }

    const { data: service, error: serviceError } = await supabase
      .from('service_templates')
      .select('name, category')
      .eq('id', params.id)
      .single()

    if (serviceError) {
      logIntakeRouteError('intake-form', 'service_lookup', serviceError, {
        serviceTemplateId: params.id,
      })
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({
      service,
      fields: fields || [],
      conditions: conditions || [],
    })
  } catch (error) {
    logIntakeRouteError('intake-form', 'unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
