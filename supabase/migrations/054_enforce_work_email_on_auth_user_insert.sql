-- Reject new auth users whose email uses a personal / webmail domain.
-- Keeps logic aligned with lib/auth/blocked-signup-email-domains.ts (update both when changing the list).
-- Skips the check when email is null/empty (e.g. phone-only identities).

create table if not exists public.signup_blocked_email_domains (
  domain text primary key
);

insert into public.signup_blocked_email_domains (domain) values
  ('gmail.com'),
  ('googlemail.com'),
  ('hotmail.com'),
  ('hotmail.co.uk'),
  ('outlook.com'),
  ('outlook.co.uk'),
  ('live.com'),
  ('msn.com'),
  ('yahoo.com'),
  ('yahoo.co.uk'),
  ('yahoo.co.jp'),
  ('ymail.com'),
  ('rocketmail.com'),
  ('icloud.com'),
  ('me.com'),
  ('mac.com'),
  ('aol.com'),
  ('protonmail.com'),
  ('proton.me'),
  ('pm.me'),
  ('gmx.com'),
  ('gmx.net'),
  ('web.de'),
  ('t-online.de'),
  ('mail.com'),
  ('email.com'),
  ('inbox.com'),
  ('tutanota.com'),
  ('tuta.io'),
  ('hey.com'),
  ('fastmail.com'),
  ('fastmail.fm'),
  ('mail.ru'),
  ('yandex.com'),
  ('yandex.ru'),
  ('qq.com'),
  ('163.com'),
  ('126.com'),
  ('sina.com'),
  ('naver.com'),
  ('daum.net'),
  ('duck.com'),
  ('skiff.com'),
  ('skiff.org')
on conflict (domain) do nothing;

comment on table public.signup_blocked_email_domains is
  'Personal domains blocked for new auth signups; mirror lib/auth/blocked-signup-email-domains.ts';

alter table public.signup_blocked_email_domains enable row level security;

revoke all on public.signup_blocked_email_domains from public;

create or replace function public.enforce_work_email_for_new_auth_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  dom text;
begin
  if new.email is null or length(trim(new.email)) = 0 then
    return new;
  end if;

  normalized_email := lower(trim(new.email));
  dom := split_part(normalized_email, '@', 2);

  if dom is null or dom = '' then
    raise exception 'Invalid email address';
  end if;

  if exists (
    select 1
    from public.signup_blocked_email_domains b
    where dom = b.domain
       or dom like '%.' || b.domain
  ) then
    raise exception
      using message = 'Please use your work email address. Signups from personal providers (Gmail, Outlook, Yahoo, iCloud, and similar) are not accepted.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_work_email_before_insert on auth.users;
create trigger enforce_work_email_before_insert
  before insert on auth.users
  for each row
  execute function public.enforce_work_email_for_new_auth_users();
