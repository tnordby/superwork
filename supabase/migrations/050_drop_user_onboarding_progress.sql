-- Remove in-app customer onboarding checklist; onboarding is handled outside the product.
-- Apply in each environment: `supabase db push`, `supabase migration up`, or run against Postgres once.

DROP TABLE IF EXISTS public.user_onboarding_progress;

DROP FUNCTION IF EXISTS public.set_user_onboarding_progress_updated_at();
