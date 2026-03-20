-- Internal-only PM rationale for final pricing decisions.

alter table public.quotes
  add column if not exists pricing_rationale text;

