import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { resolvePlatformRole } from '@/lib/auth/resolve-platform-role';
import { isInternalStaff } from '@/lib/auth/platform-role';
import {
  INTERNAL_SELECTED_WORKSPACE_COOKIE,
  readSelectedWorkspaceIdFromRequest,
  resolveSelectedWorkspaceForRole,
} from '@/lib/internal/client-context';

function cookieMaxAgeSeconds() {
  return 60 * 60 * 24 * 365;
}

function setWorkspaceCookie(response: NextResponse, workspaceId: string) {
  response.cookies.set(INTERNAL_SELECTED_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: cookieMaxAgeSeconds(),
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  if (!isInternalStaff(role)) {
    return NextResponse.json({ workspace_id: null, workspace_name: null, options: [] }, { status: 200 });
  }

  let db = supabase;
  try {
    db = createServiceRoleClient() as typeof supabase;
  } catch {
    // Fallback to RLS client when service role is unavailable.
  }

  const requestedWorkspaceId = readSelectedWorkspaceIdFromRequest(request);
  const { workspaceId, options } = await resolveSelectedWorkspaceForRole(db, role, requestedWorkspaceId);
  const selected = workspaceId ? options.find((option) => option.id === workspaceId) : null;

  const response = NextResponse.json(
    {
      workspace_id: workspaceId,
      workspace_name: selected?.name ?? null,
      options,
    },
    { status: 200 }
  );
  if (workspaceId) {
    setWorkspaceCookie(response, workspaceId);
  }
  return response;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await resolvePlatformRole(supabase, user.id, user.user_metadata?.role);
  if (!isInternalStaff(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedWorkspaceId =
    typeof body.workspace_id === 'string' && body.workspace_id.trim() ? body.workspace_id.trim() : null;
  if (!requestedWorkspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 });
  }

  let db = supabase;
  try {
    db = createServiceRoleClient() as typeof supabase;
  } catch {
    // Fallback to RLS client when service role is unavailable.
  }

  const { workspaceId, options } = await resolveSelectedWorkspaceForRole(db, role, requestedWorkspaceId);
  if (!workspaceId || workspaceId !== requestedWorkspaceId) {
    return NextResponse.json({ error: 'Invalid workspace selection' }, { status: 400 });
  }

  const selected = options.find((option) => option.id === workspaceId);
  const response = NextResponse.json(
    {
      workspace_id: workspaceId,
      workspace_name: selected?.name ?? null,
    },
    { status: 200 }
  );
  setWorkspaceCookie(response, workspaceId);
  return response;
}
