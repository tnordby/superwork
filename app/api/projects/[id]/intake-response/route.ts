import { readJsonWithLimit } from '@/lib/api/read-json-body'
import { createClient } from '@/lib/supabase/server'
import { assertIntakeMatchesProject } from '@/lib/intake/assert-intake-matches-project'
import { sanitizeAndValidateIntakeResponses } from '@/lib/intake/sanitize-intake-responses'
import { logIntakeRouteError } from '@/lib/observability/intake-server-log'
import { isUuidString } from '@/lib/validation/is-uuid'
import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role'
import { isInternalStaff } from '@/lib/auth/platform-role'
import { readSelectedWorkspaceIdFromRequest } from '@/lib/internal/client-context'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    if (!isUuidString(params.id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
    }

    const parsed = await readJsonWithLimit(request)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status })
    }

    const body = parsed.value
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
    }

    const { serviceTemplateId, responses } = body as Record<string, unknown>

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role)
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request)
    if (isInternalStaff(platformRole) && !selectedWorkspaceId) {
      return NextResponse.json(
        { error: 'Select a client context before updating intake responses.' },
        { status: 400 }
      )
    }

    if (
      typeof serviceTemplateId !== 'string' ||
      !isUuidString(serviceTemplateId) ||
      responses === undefined ||
      responses === null
    ) {
      return NextResponse.json(
        { error: 'serviceTemplateId (uuid) and responses are required' },
        { status: 400 }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, workspace_id, service_template_id')
      .eq('id', params.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (!isInternalStaff(platformRole) && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (isInternalStaff(platformRole) && selectedWorkspaceId && project.workspace_id !== selectedWorkspaceId) {
      return NextResponse.json(
        { error: 'Project is outside selected client context' },
        { status: 403 }
      )
    }

    const templateCheck = assertIntakeMatchesProject(project, serviceTemplateId)
    if (!templateCheck.ok) {
      return NextResponse.json(
        { error: templateCheck.error },
        { status: templateCheck.status }
      )
    }

    const { data: intakeFields, error: intakeFieldsError } = await supabase
      .from('intake_form_fields')
      .select('field_name, field_type, label, is_required')
      .eq('service_template_id', serviceTemplateId)

    if (intakeFieldsError) {
      logIntakeRouteError('intake-response', 'load_fields', intakeFieldsError, {
        projectId: params.id,
        serviceTemplateId,
      })
      return NextResponse.json({ error: 'Failed to load intake form' }, { status: 500 })
    }

    if (!intakeFields?.length) {
      return NextResponse.json(
        { error: 'No intake form configured for this service template' },
        { status: 400 }
      )
    }

    const { data: intakeConditions, error: intakeConditionsError } = await supabase
      .from('intake_form_conditions')
      .select('trigger_field_name, trigger_value, action, target_field_names')
      .eq('service_template_id', serviceTemplateId)
      .order('order_index', { ascending: true })
      .order('id', { ascending: true })

    if (intakeConditionsError) {
      logIntakeRouteError('intake-response', 'load_conditions', intakeConditionsError, {
        projectId: params.id,
        serviceTemplateId,
      })
      return NextResponse.json({ error: 'Failed to load intake rules' }, { status: 500 })
    }

    const validated = sanitizeAndValidateIntakeResponses(
      intakeFields,
      intakeConditions ?? [],
      responses
    )

    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: validated.status ?? 400 }
      )
    }

    const sanitizedResponses = validated.responses

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
          responses: sanitizedResponses,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        logIntakeRouteError('intake-response', 'update_row', error, {
          projectId: params.id,
          serviceTemplateId,
        })
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
          responses: sanitizedResponses,
        })
        .select()
        .single()

      if (error) {
        logIntakeRouteError('intake-response', 'insert_row', error, {
          projectId: params.id,
          serviceTemplateId,
        })
        return NextResponse.json(
          { error: 'Failed to save intake response' },
          { status: 500 }
        )
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    logIntakeRouteError('intake-response', 'post_unexpected', error)
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

    if (!isUuidString(params.id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role)
    const selectedWorkspaceId = readSelectedWorkspaceIdFromRequest(request)

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, workspace_id')
      .eq('id', params.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (!isInternalStaff(platformRole) && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (isInternalStaff(platformRole) && selectedWorkspaceId && project.workspace_id !== selectedWorkspaceId) {
      return NextResponse.json(
        { error: 'Project is outside selected client context' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('project_intake_responses')
      .select('*')
      .eq('project_id', params.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      logIntakeRouteError('intake-response', 'get_row', error, { projectId: params.id })
      return NextResponse.json(
        { error: 'Failed to fetch intake response' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || null)
  } catch (error) {
    logIntakeRouteError('intake-response', 'get_unexpected', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
