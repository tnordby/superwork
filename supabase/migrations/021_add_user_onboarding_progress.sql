-- Track onboarding checklist completion per authenticated user.

create table if not exists public.user_onboarding_progress (
  user_id uuid primary key references auth.users on delete cascade,
  video_completed boolean not null default false,
  document_completed boolean not null default false,
  survey_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.user_onboarding_progress enable row level security;

drop policy if exists "Users can view own onboarding progress" on public.user_onboarding_progress;
create policy "Users can view own onboarding progress"
  on public.user_onboarding_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own onboarding progress" on public.user_onboarding_progress;
create policy "Users can insert own onboarding progress"
  on public.user_onboarding_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own onboarding progress" on public.user_onboarding_progress;
create policy "Users can update own onboarding progress"
  on public.user_onboarding_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_user_onboarding_progress_updated_at on public.user_onboarding_progress;

create or replace function public.set_user_onboarding_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger set_user_onboarding_progress_updated_at
  before update on public.user_onboarding_progress
  for each row
  execute function public.set_user_onboarding_progress_updated_at();

