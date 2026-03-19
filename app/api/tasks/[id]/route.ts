import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role'
import { isServicesAdmin } from '@/lib/auth/platform-role'

// PATCH /api/tasks/[id] - Update SOP task
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const params = await context.params

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role)
  if (!isServicesAdmin(platformRole)) {
    return NextResponse.json(
      { error: 'Only admins can update SOP tasks' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { title, description, order_index, is_required, estimated_hours } = body

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (order_index !== undefined) updates.order_index = order_index
  if (is_required !== undefined) updates.is_required = is_required
  if (estimated_hours !== undefined) updates.estimated_hours = estimated_hours

  const { data, error } = await supabase
    .from('sop_tasks')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/tasks/[id] - Delete SOP task
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const params = await context.params

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platformRole = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role)
  if (!isServicesAdmin(platformRole)) {
    return NextResponse.json(
      { error: 'Only admins can delete SOP tasks' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('sop_tasks')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
