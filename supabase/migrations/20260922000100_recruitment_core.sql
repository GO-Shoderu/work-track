-- ATS Recruitment Core: FR-020/021/030/031/040-045/050-059; QR-SEC-001/002/003/006/007.
-- Review only: no seeds, Auth mutations or changes to applied migrations.
begin;
create type public.application_stage as enum ('applied','screening','interview','offer','hired','rejected');
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  title text not null check (title = btrim(title) and char_length(title) between 1 and 200),
  description text check (char_length(description) <= 20000),
  created_at timestamptz not null default now(),
  unique (organisation_id, id)
);
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  full_name text not null check (full_name = btrim(full_name) and char_length(full_name) between 1 and 200),
  email text check (email = btrim(email) and char_length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  phone text check (phone = btrim(phone) and char_length(phone) between 1 and 50),
  linkedin_url text check (char_length(linkedin_url) <= 2048 and linkedin_url ~ '^https://(www[.])?linkedin[.]com/in/[A-Za-z0-9_%~-]+/?$'),
  created_at timestamptz not null default now(),
  unique (organisation_id, id)
);
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  candidate_id uuid not null,
  job_id uuid not null,
  stage public.application_stage not null default 'applied',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_candidate_fkey foreign key (organisation_id,candidate_id)
    references public.candidates(organisation_id,id) on update restrict on delete restrict,
  constraint applications_job_fkey foreign key (organisation_id,job_id)
    references public.jobs(organisation_id,id) on update restrict on delete restrict,
  constraint applications_candidate_job_key unique (candidate_id,job_id)
);
create index jobs_organisation_created_idx on public.jobs(organisation_id,created_at,id);
create index candidates_organisation_created_idx on public.candidates(organisation_id,created_at,id);
create index applications_organisation_created_idx on public.applications(organisation_id,created_at,id);
create index applications_organisation_job_idx on public.applications(organisation_id,job_id);
create index applications_organisation_candidate_idx on public.applications(organisation_id,candidate_id);
create index applications_organisation_stage_idx on public.applications(organisation_id,stage);
create trigger applications_updated_at before update on public.applications
  for each row execute function private.set_updated_at();

revoke all on type public.application_stage from public,anon,authenticated,service_role;
grant usage on type public.application_stage to authenticated;
revoke all on public.jobs,public.candidates,public.applications from public,anon,authenticated,service_role;
grant select on public.jobs,public.candidates,public.applications to authenticated;
-- Column grants prevent callers choosing IDs/timestamps/stage or moving relationships.
grant insert (organisation_id,title,description) on public.jobs to authenticated;
grant insert (organisation_id,full_name,email,phone,linkedin_url) on public.candidates to authenticated;
grant insert (organisation_id,candidate_id,job_id) on public.applications to authenticated;
grant update (stage) on public.applications to authenticated;

alter table public.jobs enable row level security;
create policy jobs_select on public.jobs for select to authenticated using (((select private.current_app_role()) = 'platform_owner' or organisation_id = (select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)));
create policy jobs_insert on public.jobs for insert to authenticated with check (((select private.current_app_role()) = 'platform_owner' or organisation_id = (select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)));

alter table public.candidates enable row level security;
create policy candidates_select on public.candidates for select to authenticated using (((select private.current_app_role()) = 'platform_owner' or organisation_id = (select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)));
create policy candidates_insert on public.candidates for insert to authenticated with check (((select private.current_app_role()) = 'platform_owner' or organisation_id = (select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)));

alter table public.applications enable row level security;
create policy applications_select on public.applications for select to authenticated using (((select private.current_app_role()) = 'platform_owner' or organisation_id = (select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)));
create policy applications_insert on public.applications for insert to authenticated with check (((select private.current_app_role()) = 'platform_owner' or organisation_id = (select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)));
create policy applications_update_stage on public.applications for update to authenticated using (((select private.current_app_role()) = 'platform_owner' or organisation_id = (select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id))) with check (((select private.current_app_role()) = 'platform_owner' or organisation_id = (select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)));
commit;
