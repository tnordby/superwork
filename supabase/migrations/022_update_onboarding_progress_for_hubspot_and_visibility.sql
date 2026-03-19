-- Replace video onboarding step with HubSpot access completion
-- and allow users to manually hide onboarding section.

alter table public.user_onboarding_progress
  add column if not exists hubspot_access_completed boolean not null default false;

alter table public.user_onboarding_progress
  add column if not exists is_hidden boolean not null default false;

-- Backfill: preserve any existing completion in video field.
update public.user_onboarding_progress
set hubspot_access_completed = coalesce(hubspot_access_completed, false) or coalesce(video_completed, false);

