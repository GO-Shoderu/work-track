-- Phase 1 domain foundation: FR-022-025/040-045/090-096/070/071/073.
-- No public access, Storage changes, external calls or stage automation.
begin;
create type public.job_status as enum ('draft','published','closed','archived');
create type public.application_source as enum ('manual','public');
create type public.assessment_status as enum ('not_ready','pending','completed','failed','stale');
revoke all on type public.job_status,public.application_source,public.assessment_status from public,anon,authenticated,service_role;
grant usage on type public.job_status,public.application_source,public.assessment_status to authenticated;

-- Random URL-safe defaults also backfill existing Organisations without collisions
-- from duplicate names, non-Latin names or empty transliterations.
alter table public.organisations add column careers_slug text not null
  default ('org-' || replace(gen_random_uuid()::text,'-',''))
  constraint organisations_careers_slug_key unique
  constraint organisations_careers_slug_format check
    (char_length(careers_slug) between 3 and 80 and careers_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.jobs
  add column status public.job_status not null default 'draft',
  add column public_id uuid not null default gen_random_uuid() unique,
  add column closes_at timestamptz,
  add column published_at timestamptz,
  add column closed_at timestamptz,
  add column updated_at timestamptz,
  add column content_version integer not null default 1 check (content_version > 0),
  add column description_rich jsonb check
    (jsonb_typeof(description_rich)='object' and octet_length(description_rich::text)<=131072),
  add column teaser text check (char_length(teaser) between 1 and 500);
comment on column public.jobs.description is
  'Plain-text description; future rich-text writes must supply the derived plain text here. Existing text is preserved.';
comment on column public.jobs.description_rich is
  'Reserved structured rich document, not trusted HTML. Editor schema, derivation and sanitisation are a later phase.';
comment on column public.jobs.teaser is
  'Reserved AI-generated short teaser; cleared on substantive content changes. No generator in Phase 1.';

-- Evaluate at read time, never store an open flag that becomes incorrect at expiry.
-- This predicate grants no public row access and is not a public endpoint.
create function private.job_is_publicly_open(job_state public.job_status, deadline timestamptz)
returns boolean language sql stable security invoker set search_path = '' as $$
  select job_state='published' and (deadline is null or deadline>statement_timestamp());
$$;
alter function private.job_is_publicly_open(public.job_status,timestamptz) owner to postgres;
revoke all on function private.job_is_publicly_open(public.job_status,timestamptz) from public,anon,authenticated,service_role;
grant execute on function private.job_is_publicly_open(public.job_status,timestamptz) to authenticated;

create function private.prepare_job_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.public_id is distinct from old.public_id then
    raise exception 'Public Job identifier is immutable' using errcode='22023';
  end if;
  new.content_version := old.content_version;
  -- Whitespace-only edits are not substantive. Rich JSON changes conservatively
  -- invalidate until a specific editor schema/semantic normaliser is introduced.
  if btrim(regexp_replace(new.title,'[[:space:]]+',' ','g')) is distinct from
       btrim(regexp_replace(old.title,'[[:space:]]+',' ','g'))
    or btrim(regexp_replace(coalesce(new.description,''),'[[:space:]]+',' ','g')) is distinct from
       btrim(regexp_replace(coalesce(old.description,''),'[[:space:]]+',' ','g'))
    or new.description_rich is distinct from old.description_rich then
    new.content_version := old.content_version + 1;
    new.teaser := null;
  end if;
  new.updated_at := now();
  new.published_at := old.published_at;
  new.closed_at := old.closed_at;
  if new.status is distinct from old.status then
    if new.status='published' then
      new.published_at := now();
      new.closed_at := null;
    elsif new.status='closed' then
      new.closed_at := now();
    end if;
  end if;
  return new;
end;
$$;
alter function private.prepare_job_update() owner to postgres;
revoke all on function private.prepare_job_update() from public,anon,authenticated,service_role;
create trigger jobs_prepare_update before update on public.jobs
  for each row execute function private.prepare_job_update();
-- Reuse exactly the existing recruitment tenant/assignment model.
create policy jobs_update on public.jobs for update to authenticated
 using (((select private.current_app_role())='platform_owner' or organisation_id=(select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)))
 with check (((select private.current_app_role())='platform_owner' or organisation_id=(select private.current_customer_organisation_id()) or private.is_assigned_admin(organisation_id)));
grant update (title,description,status,closes_at) on public.jobs to authenticated;
-- Rich content awaits the Phase 2 validated write boundary; no direct client writes.
-- Teaser, identifiers, version and timestamps remain server/database-managed.

alter table public.applications
  add column source public.application_source not null default 'manual',
  add column removed_at timestamptz,
  add column assessment_status public.assessment_status not null default 'not_ready';
grant update (removed_at) on public.applications to authenticated;
-- Source and assessment status have no client write grants. Pending/failed are
-- reserved for the later assessment orchestration; not_ready means no run yet.
comment on column public.applications.removed_at is
  'Non-null excludes this Application from the active pipeline; NULL restores it without deleting history.';

-- Existing results were saved against immutable Job content in the prior schema.
alter table public.candidate_assessments add column job_content_version integer;
update public.candidate_assessments ca set job_content_version=j.content_version
 from public.applications a join public.jobs j on j.id=a.job_id and j.organisation_id=a.organisation_id
 where ca.application_id=a.id and ca.organisation_id=a.organisation_id;
alter table public.candidate_assessments alter column job_content_version set not null;
alter table public.candidate_assessments add constraint candidate_assessments_job_version_positive check (job_content_version>0);
update public.applications a set assessment_status=case
 when exists(select 1 from public.candidate_cvs cv where cv.candidate_id=a.candidate_id
   and cv.organisation_id=a.organisation_id and cv.object_id=ca.cv_object_id)
 then 'completed'::public.assessment_status else 'stale'::public.assessment_status end
 from public.candidate_assessments ca where ca.application_id=a.id and ca.organisation_id=a.organisation_id;

drop policy candidate_assessments_select on public.candidate_assessments;
create policy candidate_assessments_select on public.candidate_assessments for select to authenticated
 using (exists(select 1 from public.applications a
   join public.candidate_cvs cv on cv.candidate_id=a.candidate_id and cv.organisation_id=a.organisation_id
   join public.jobs j on j.id=a.job_id and j.organisation_id=a.organisation_id
   where a.id=application_id and a.organisation_id=candidate_assessments.organisation_id
     and cv.object_id=cv_object_id and j.content_version=job_content_version));

-- Trigger-only, narrowly scoped writes: callers cannot set assessment_status.
-- Parent rows are already locked by UPDATE; saving also locks Job and CV versions.
create function private.stale_job_assessments()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.content_version is distinct from old.content_version then
    update public.applications set assessment_status='stale'
      where job_id=new.id and organisation_id=new.organisation_id
        and assessment_status in ('pending','completed','failed');
  end if;
  return new;
end;
$$;
create function private.stale_cv_assessments()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.object_id is distinct from old.object_id then
    update public.applications set assessment_status='stale'
      where candidate_id=new.candidate_id and organisation_id=new.organisation_id
        and assessment_status in ('pending','completed','failed');
  end if;
  return new;
end;
$$;
alter function private.stale_job_assessments() owner to postgres;
alter function private.stale_cv_assessments() owner to postgres;
revoke all on function private.stale_job_assessments(),private.stale_cv_assessments() from public,anon,authenticated,service_role;
create trigger jobs_stale_assessments after update on public.jobs
 for each row execute function private.stale_job_assessments();
create trigger candidate_cvs_stale_assessments after update on public.candidate_cvs
 for each row execute function private.stale_cv_assessments();

-- Remove the unsafe old signature: callers must identify the Job content they
-- actually assessed, not have the database stamp today's version on old output.
drop function public.save_candidate_assessment(uuid,uuid,jsonb);
create function public.save_candidate_assessment(target_application_id uuid, target_cv_object_id uuid, target_job_content_version integer, validated_result jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; target public.applications%rowtype; current_version uuid; current_job_version integer; item jsonb; field text;
begin
 select p.* into actor from public.profiles p where p.id=auth.uid() for share;
 if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 select a.* into target from public.applications a where a.id=target_application_id;
 if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 if actor.role='customer' then
   if actor.organisation_id is distinct from target.organisation_id then raise exception 'Not authorised' using errcode='42501'; end if;
 elsif actor.role='admin' then
   perform 1 from public.admin_organisation_assignments a where a.admin_id=actor.id and a.organisation_id=target.organisation_id for share;
   if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 elsif actor.role is distinct from 'platform_owner'::public.app_role then
   raise exception 'Not authorised' using errcode='42501';
 end if;
 -- Relationships are immutable to callers. Lock inputs before updating status;
 -- concurrent edits either wait then stale this result, or fail version checks.
 select j.content_version into current_job_version from public.jobs j
   where j.id=target.job_id and j.organisation_id=target.organisation_id for share;
 if not found or current_job_version is distinct from target_job_content_version then raise exception 'Job changed' using errcode='22023'; end if;
 -- Existing Application composite FKs guarantee Candidate/Job tenant agreement.
 select cv.object_id into current_version from public.candidate_cvs cv
   where cv.candidate_id=target.candidate_id and cv.organisation_id=target.organisation_id for share;
 if not found or current_version is distinct from target_cv_object_id then raise exception 'CV changed' using errcode='22023'; end if;
 if jsonb_typeof(validated_result) is distinct from 'object' or octet_length(validated_result::text)>65536 then raise exception 'Invalid result' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(validated_result))<>6
   or not (validated_result ?& array['score','summary','strengths','gaps','recommendation','disclaimer']) then raise exception 'Invalid result' using errcode='22023'; end if;
 if jsonb_typeof(validated_result->'score') is distinct from 'number' then raise exception 'Invalid score' using errcode='22023'; end if;
 if (validated_result->>'score')::numeric not between 0 and 100
   or trunc((validated_result->>'score')::numeric)<>(validated_result->>'score')::numeric then raise exception 'Invalid score' using errcode='22023'; end if;
 if jsonb_typeof(validated_result->'summary') is distinct from 'string'
   or char_length(btrim(validated_result->>'summary')) not between 1 and 1200 then raise exception 'Invalid summary' using errcode='22023'; end if;
 foreach field in array array['strengths','gaps'] loop
   if jsonb_typeof(validated_result->field) is distinct from 'array' then raise exception 'Invalid list' using errcode='22023'; end if;
   if jsonb_array_length(validated_result->field)>8 then raise exception 'Invalid list' using errcode='22023'; end if;
   for item in select value from jsonb_array_elements(validated_result->field) loop
     if jsonb_typeof(item) is distinct from 'string' or char_length(btrim(item#>>'{}')) not between 1 and 400 then raise exception 'Invalid list item' using errcode='22023'; end if;
   end loop;
 end loop;
 if (validated_result->>'recommendation') is null or (validated_result->>'recommendation') not in ('strong_match','potential_match','weak_match')
   or (validated_result->>'disclaimer') is distinct from 'AI-assisted assessment. Human recruiter judgement is required. This is not a hiring decision.' then raise exception 'Invalid result' using errcode='22023'; end if;
 insert into public.candidate_assessments(application_id,organisation_id,cv_object_id,job_content_version,result)
 values(target.id,target.organisation_id,current_version,current_job_version,validated_result)
 on conflict(application_id) do update set cv_object_id=excluded.cv_object_id,job_content_version=excluded.job_content_version,result=excluded.result,assessed_at=now();
 update public.applications set assessment_status='completed' where id=target.id and organisation_id=target.organisation_id;
 return target.id;
end;
$$;
alter function public.save_candidate_assessment(uuid,uuid,integer,jsonb) owner to postgres;
revoke all on function public.save_candidate_assessment(uuid,uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_candidate_assessment(uuid,uuid,integer,jsonb) to authenticated;
commit;
