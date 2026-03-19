-- Support group conversations by storing participant display names.
-- Keep consultant_name for backward compatibility as the primary contact.

alter table public.conversations
  add column if not exists participant_names text[] not null default '{}';

-- Backfill old rows so existing 1:1 conversations have at least one participant.
update public.conversations
set participant_names = case
  when consultant_name is null or consultant_name = '' then participant_names
  when array_length(participant_names, 1) is null then array[consultant_name]
  when not (consultant_name = any(participant_names)) then participant_names || consultant_name
  else participant_names
end;

