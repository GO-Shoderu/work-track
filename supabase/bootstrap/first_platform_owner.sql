-- REVIEW ONLY. NOT A MIGRATION. Do not execute before separate approval.
-- First create/verify the intended Auth identity using trusted Supabase admin.
-- In a private SQL Editor copy, replace the three NULLs; never commit real data.
begin;
lock table public.profiles in share row exclusive mode;
do $$
declare
  target_user_id uuid := null;
  expected_email text := null;
  owner_full_name text := null;
begin
  if target_user_id is null or expected_email is null or owner_full_name is null then
    raise exception 'Replace all bootstrap placeholders in a private copy first';
  end if;
  if exists (select 1 from public.profiles where role = 'platform_owner') then
    raise exception 'A Platform Owner already exists; bootstrap refused';
  end if;
  if exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'This identity already has a profile; bootstrap will not promote or overwrite it';
  end if;
  if not exists (
    select 1 from auth.users
    where id = target_user_id
      and lower(email) = lower(btrim(expected_email))
      and email_confirmed_at is not null
      and coalesce(is_anonymous, false) = false
  ) then
    raise exception 'Expected confirmed, non-anonymous Auth identity was not found';
  end if;
  insert into public.profiles (id, full_name, role, organisation_id)
    values (target_user_id, btrim(owner_full_name), 'platform_owner', null);
end;
$$;
commit;
