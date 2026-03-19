import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth/api';

type OnboardingProgressRow = {
  user_id: string;
  hubspot_access_completed: boolean;
  document_completed: boolean;
  survey_completed: boolean;
  is_hidden: boolean;
};

function normalizeProgress(row: Partial<OnboardingProgressRow> | null, userId: string): OnboardingProgressRow {
  return {
    user_id: userId,
    hubspot_access_completed: Boolean(row?.hubspot_access_completed),
    document_completed: Boolean(row?.document_completed),
    survey_completed: Boolean(row?.survey_completed),
    is_hidden: Boolean(row?.is_hidden),
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { user, errorResponse } = await requireAuthenticatedUser(supabase);
    if (errorResponse) return errorResponse;

    const { data, error } = await supabase
      .from('user_onboarding_progress')
      .select('user_id, hubspot_access_completed, document_completed, survey_completed, is_hidden')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ progress: normalizeProgress(data, user.id) }, { status: 200 });
  } catch (error) {
    console.error('[onboarding/progress] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load onboarding progress' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, errorResponse } = await requireAuthenticatedUser(supabase);
    if (errorResponse) return errorResponse;

    const body = await request.json();

    const patch: Partial<OnboardingProgressRow> = {};
    if (typeof body?.hubspotAccessCompleted === 'boolean') {
      patch.hubspot_access_completed = body.hubspotAccessCompleted;
    }
    if (typeof body?.documentCompleted === 'boolean') patch.document_completed = body.documentCompleted;
    if (typeof body?.surveyCompleted === 'boolean') patch.survey_completed = body.surveyCompleted;
    if (typeof body?.isHidden === 'boolean') patch.is_hidden = body.isHidden;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('user_onboarding_progress')
      .select('user_id, hubspot_access_completed, document_completed, survey_completed, is_hidden')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) throw existingError;

    const nextRecord = {
      ...normalizeProgress(existing, user.id),
      ...patch,
    };

    const { data: updated, error: upsertError } = await supabase
      .from('user_onboarding_progress')
      .upsert(nextRecord, { onConflict: 'user_id' })
      .select('user_id, hubspot_access_completed, document_completed, survey_completed, is_hidden')
      .single();

    if (upsertError) throw upsertError;

    return NextResponse.json({ progress: updated }, { status: 200 });
  } catch (error) {
    console.error('[onboarding/progress] PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update onboarding progress' }, { status: 500 });
  }
}

