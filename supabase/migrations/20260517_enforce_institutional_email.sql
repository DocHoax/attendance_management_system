-- Migration: Enforce institutional email domain at the DB/auth level
-- Prevents auth signups and profile writes with non-@lasustech.edu.ng emails.

-- Shared predicate for all DB-level checks. `btrim` accepts harmless surrounding
-- whitespace, while the regex requires exactly one institutional domain suffix.
create or replace function public.is_institutional_email(email text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(lower(btrim(email)) ~ '^[^@[:space:]]+@lasustech[.]edu[.]ng$', false);
$$;

-- Create trigger function
create or replace function public.enforce_institutional_email()
returns trigger as $$
begin
  if not public.is_institutional_email(new.email) then
    raise exception 'registrations are restricted to @lasustech.edu.ng email addresses';
  end if;

  -- Store normalized profile emails.
  new.email := lower(btrim(new.email));

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Auth-level trigger function. This rejects invalid Supabase Auth users before
-- the `on_auth_user_created` trigger can create a public profile.
create or replace function public.enforce_auth_institutional_email()
returns trigger as $$
begin
  if not public.is_institutional_email(new.email) then
    raise exception 'registrations are restricted to @lasustech.edu.ng email addresses';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Attach trigger to auth.users so Supabase Auth signups/email changes are blocked
-- at the database layer, not only by application-side validation.
drop trigger if exists enforce_auth_institutional_email on auth.users;
create trigger enforce_auth_institutional_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_auth_institutional_email();

-- Attach trigger to profiles table
drop trigger if exists enforce_institutional_email on public.profiles;
create trigger enforce_institutional_email
  before insert or update on public.profiles
  for each row execute function public.enforce_institutional_email();

-- Defense-in-depth for direct writes that bypass triggers being disabled: this
-- validates future profile rows while avoiding migration failure if legacy bad
-- data already exists. Run `alter table public.profiles validate constraint ...`
-- after cleaning any legacy rows, if desired.
alter table public.profiles
  drop constraint if exists profiles_institutional_email_check;

alter table public.profiles
  add constraint profiles_institutional_email_check
  check (public.is_institutional_email(email)) not valid;
