-- Milestone 2: FR-001/002/008/010/014/015/065; QR-SEC-001/002/003/007.
-- REVIEW ONLY. Run as postgres only after explicit approval. No Auth users,
-- organisations, profiles, or assignments are seeded by this migration.
begin;

create type public.app_role as enum ('platform_owner', 'admin', 'customer');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (full_name = btrim(full_name) and char_length(full_name) between 1 and 200),
  role public.app_role not null,
  organisation_id uuid references public.organisations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_id_role_key unique (id, role),
  constraint profiles_role_organisation_check check (
    (role = 'customer' and organisation_id is not null)
    or (role in ('platform_owner', 'admin') and organisation_id is null)
  )
);

create table public.admin_organisation_assignments (
  admin_id uuid not null,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  -- Integrity discriminator, not an independently editable application role.
  admin_role public.app_role not null default 'admin' check (admin_role = 'admin'),
  created_at timestamptz not null default now(),
  primary key (admin_id, organisation_id),
  constraint assignments_admin_profile_fkey foreign key (admin_id, admin_role)
    references public.profiles(id, role) on update restrict on delete cascade
);

create index profiles_organisation_id_idx on public.profiles(organisation_id)
  where organisation_id is not null;
create index assignments_organisation_id_idx
  on public.admin_organisation_assignments(organisation_id);

alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_organisation_assignments enable row level security;

-- Remove Supabase default grants, including TRUNCATE, REFERENCES and TRIGGER.
-- Even Owners have no Data API mutation path in this milestone.
revoke all on table public.organisations, public.profiles,
  public.admin_organisation_assignments from public, anon, authenticated, service_role;
grant select on table public.organisations, public.profiles,
  public.admin_organisation_assignments to authenticated;
revoke all on type public.app_role from public, anon, authenticated, service_role;
grant usage on type public.app_role to authenticated;
grant usage on schema public to authenticated;

-- Not an exposed Data API schema. Only the migration administrator owns it.
create schema private authorization postgres;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organisations_updated_at before update on public.organisations
  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- These narrowly scoped, read-only helpers bypass recursive table policies.
-- Caller identity ALWAYS comes from auth.uid(), never a function argument.
create function private.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles as p where p.id = (select auth.uid());
$$;

create function private.current_customer_organisation_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.organisation_id from public.profiles as p
  where p.id = (select auth.uid()) and p.role = 'customer';
$$;

create function private.is_assigned_admin(target_organisation_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles as p
    join public.admin_organisation_assignments as a on a.admin_id = p.id
    where p.id = (select auth.uid()) and p.role = 'admin'
      and a.organisation_id = target_organisation_id
  );
$$;

alter function private.set_updated_at() owner to postgres;
alter function private.current_app_role() owner to postgres;
alter function private.current_customer_organisation_id() owner to postgres;
alter function private.is_assigned_admin(uuid) owner to postgres;

revoke all on function private.set_updated_at(), private.current_app_role(),
  private.current_customer_organisation_id(), private.is_assigned_admin(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.current_app_role(),
  private.current_customer_organisation_id(), private.is_assigned_admin(uuid)
  to authenticated;
-- Trigger execution does not require an application EXECUTE grant.

create policy organisations_select_owner on public.organisations
  for select to authenticated
  using ((select private.current_app_role()) = 'platform_owner');

create policy organisations_select_assigned_admin on public.organisations
  for select to authenticated
  using (private.is_assigned_admin(id));

create policy organisations_select_customer on public.organisations
  for select to authenticated
  using (id = (select private.current_customer_organisation_id()));

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_owner on public.profiles
  for select to authenticated
  using ((select private.current_app_role()) = 'platform_owner');

create policy profiles_select_assigned_customers on public.profiles
  for select to authenticated
  using (role = 'customer' and private.is_assigned_admin(organisation_id));

create policy assignments_select_owner on public.admin_organisation_assignments
  for select to authenticated
  using ((select private.current_app_role()) = 'platform_owner');

create policy assignments_select_self_admin on public.admin_organisation_assignments
  for select to authenticated
  using (admin_id = (select auth.uid()) and (select private.current_app_role()) = 'admin');

-- No INSERT / UPDATE / DELETE policies. Future provisioning needs separate review.
commit;
