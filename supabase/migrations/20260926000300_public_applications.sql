-- Phase 2B, FR-091–096. Local review only; do not apply remotely.
begin;

-- Only these projections are public. Tenant table ACLs/RLS remain unchanged.
create function public.read_public_careers(target_slug text, page_offset integer default 0, page_size integer default 50)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
   'organisation', jsonb_build_object('name', o.name, 'careers_slug', o.careers_slug),
   'jobs', coalesce((select jsonb_agg(list.item order by list.published_at desc, list.public_id) from (
     select jsonb_build_object('public_id', j.public_id, 'title', j.title,
       'teaser', j.teaser, 'closes_at', j.closes_at, 'published_at', j.published_at) item,
       j.published_at, j.public_id
     from public.jobs j where j.organisation_id=o.id
       and j.status='published' and (j.closes_at is null or j.closes_at>statement_timestamp())
     order by j.published_at desc, j.public_id
     limit greatest(1,least(coalesce(page_size,50),100))
     offset greatest(0,least(coalesce(page_offset,0),100000))
   ) list),'[]'::jsonb))
 from public.organisations o where o.careers_slug=target_slug;
$$;
create function public.read_public_job(target_slug text, target_public_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
   'organisation', jsonb_build_object('name', o.name, 'careers_slug', o.careers_slug),
   'job', jsonb_build_object('public_id', j.public_id, 'title', j.title,
     'description_rich', j.description_rich, 'description', j.description,
     'teaser', j.teaser, 'closes_at', j.closes_at, 'published_at', j.published_at))
 from public.organisations o join public.jobs j on j.organisation_id=o.id
 where o.careers_slug=target_slug and j.public_id=target_public_id
   and j.status='published' and (j.closes_at is null or j.closes_at>statement_timestamp());
$$;
alter function public.read_public_careers(text,integer,integer) owner to postgres;
alter function public.read_public_job(text,uuid) owner to postgres;
revoke all on function public.read_public_careers(text,integer,integer),public.read_public_job(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_public_careers(text,integer,integer),public.read_public_job(text,uuid) to anon,authenticated,service_role;

-- Public CVs have a separate, immutable Application identity and path namespace.
create table public.application_cvs (
 application_id uuid primary key,
 organisation_id uuid not null,
 job_id uuid not null,
 normalized_email text not null,
 -- Immutable contact snapshot alongside the existing one-to-one submission CV.
 -- Keep submitted values verbatim except for the normalized email above.
 submitted_full_name text not null check(char_length(submitted_full_name) between 1 and 200 and char_length(btrim(submitted_full_name))>0 and submitted_full_name !~ '[[:cntrl:]]'),
 submitted_phone text check(char_length(submitted_phone) between 1 and 50 and char_length(btrim(submitted_phone))>0 and submitted_phone !~ '[[:cntrl:]]'),
 submitted_linkedin_url text check(char_length(submitted_linkedin_url)<=2048 and submitted_linkedin_url ~ '^https://(www[.])?linkedin[.]com/in/[A-Za-z0-9_%~-]+/?$'),
 object_id uuid not null unique,
 byte_size integer not null check (byte_size between 1 and 5242880),
 created_at timestamptz not null default now(),
 storage_path text generated always as
  (organisation_id::text || '/applications/' || application_id::text || '/' || object_id::text || '.pdf') stored unique,
 foreign key (organisation_id,application_id) references public.applications(organisation_id,id) on delete restrict,
 foreign key (organisation_id,job_id) references public.jobs(organisation_id,id) on delete restrict,
 unique(organisation_id,job_id,normalized_email)
);
alter table public.application_cvs enable row level security;
revoke all on public.application_cvs from public,anon,authenticated,service_role;
grant select on public.application_cvs to authenticated;
create policy application_cvs_select on public.application_cvs for select to authenticated
 using (exists(select 1 from public.applications a where a.id=application_id and a.organisation_id=application_cvs.organisation_id));

create function private.can_read_application_cv(object_name text)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.application_cvs cv where cv.storage_path=object_name);
$$;
revoke all on function private.can_read_application_cv(text) from public,anon,authenticated,service_role;
grant execute on function private.can_read_application_cv(text) to authenticated;
create policy application_cv_objects_select on storage.objects for select to authenticated
 using(bucket_id='candidate-cvs' and private.can_read_application_cv(name));
alter policy cv_objects_select_guard on storage.objects
 using(bucket_id<>'candidate-cvs' or private.can_access_candidate_cv(name) or private.can_read_application_cv(name));
-- Existing restrictive INSERT/DELETE/UPDATE guards reject the four-part public
-- CV path, including for authenticated users in the owning Organisation.

-- No browser access. Reservations bound upload paths and serialize finalization.
create table private.public_application_uploads (
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.organisations(id),
 job_id uuid not null references public.jobs(id),
 normalized_email text not null,
 object_id uuid not null default gen_random_uuid(),
 byte_size integer not null check(byte_size between 1 and 5242880),
 created_at timestamptz not null default clock_timestamp()
);
alter table private.public_application_uploads enable row level security;
revoke all on private.public_application_uploads from public,anon,authenticated,service_role;
create index public_application_uploads_job_time on private.public_application_uploads(job_id,created_at);

create function public.prepare_public_application(target_slug text,target_public_id uuid,applicant_email text,cv_bytes integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.jobs%rowtype; ticket private.public_application_uploads%rowtype; email_key text;
begin
 email_key:=lower(btrim(applicant_email));
 if email_key is null or char_length(email_key) not between 3 and 254
   or email_key !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+([.][A-Za-z0-9-]+)+$'
   or cv_bytes is null or cv_bytes not between 1 and 5242880 then
  raise exception 'Submission unavailable' using errcode='22023'; end if;
 select jobs.* into j from public.jobs jobs join public.organisations o on o.id=jobs.organisation_id
  where o.careers_slug=target_slug and jobs.public_id=target_public_id for share of jobs;
 if not found or j.status<>'published' or (j.closes_at is not null and j.closes_at<=clock_timestamp()) then
  raise exception 'Submission unavailable' using errcode='22023'; end if;
 -- A bounded durable admission limit before PDF parsing/Storage/AI. This is a
 -- backstop, not a substitute for deployment edge/IP abuse controls.
 perform pg_advisory_xact_lock(hashtextextended(j.id::text,0));
 if j.closes_at is not null and j.closes_at<=clock_timestamp() then raise exception 'Submission unavailable' using errcode='22023'; end if;
 if (select count(*) from private.public_application_uploads u where u.job_id=j.id and u.created_at>clock_timestamp()-interval '10 minutes')>=30
 or (select count(*) from private.public_application_uploads u where u.job_id=j.id and u.normalized_email=email_key and u.created_at>clock_timestamp()-interval '1 hour')>=3 then
  raise exception 'Submission unavailable' using errcode='22023'; end if;
 insert into private.public_application_uploads(organisation_id,job_id,normalized_email,byte_size)
 values(j.organisation_id,j.id,email_key,cv_bytes) returning * into ticket;
 return jsonb_build_object('id',ticket.id,'organisation_id',ticket.organisation_id,'object_id',ticket.object_id);
end $$;

create function public.complete_public_application(upload_id uuid,full_name text,applicant_email text,phone text,linkedin_url text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket private.public_application_uploads%rowtype; j public.jobs%rowtype; candidate uuid; matches integer; object_path text;
begin
 select * into ticket from private.public_application_uploads where id=upload_id for update;
 if not found then raise exception 'Submission unavailable' using errcode='22023'; end if;
 if full_name is null or (char_length(full_name) not between 1 and 200 or char_length(btrim(full_name))=0) or full_name ~ '[[:cntrl:]]'
   or lower(btrim(applicant_email)) is distinct from ticket.normalized_email
   or (phone is not null and ((char_length(phone) not between 1 and 50 or char_length(btrim(phone))=0) or phone ~ '[[:cntrl:]]'))
   or (linkedin_url is not null and (char_length(linkedin_url)>2048 or linkedin_url !~ '^https://(www[.])?linkedin[.]com/in/[A-Za-z0-9_%~-]+/?$')) then
  raise exception 'Submission unavailable' using errcode='22023'; end if;
 select * into j from public.jobs where id=ticket.job_id and organisation_id=ticket.organisation_id for share;
 if not found or j.status<>'published' or (j.closes_at is not null and j.closes_at<=clock_timestamp())
   or ticket.created_at<clock_timestamp()-interval '15 minutes' then
  raise exception 'Submission unavailable' using errcode='22023'; end if;
 object_path:=ticket.organisation_id::text||'/applications/'||ticket.id::text||'/'||ticket.object_id::text||'.pdf';
 -- The trusted server validates bytes/readability; the DB independently requires
 -- the immutable private object and matching Storage metadata before persistence.
 perform 1 from storage.objects o where o.bucket_id='candidate-cvs' and o.name=object_path
  and o.metadata->>'mimetype'='application/pdf' and o.metadata->>'size'=ticket.byte_size::text for share;
 if not found then raise exception 'CV unavailable' using errcode='22023'; end if;
 if not exists(select 1 from storage.buckets where id='candidate-cvs' and not public) then
  raise exception 'CV unavailable' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(ticket.organisation_id::text||':'||ticket.normalized_email,1));
 if j.closes_at is not null and j.closes_at<=clock_timestamp() then raise exception 'Submission unavailable' using errcode='22023'; end if;
 -- Ambiguous legacy matches fail closed. Do not collapse dots/plus aliases or
 -- mutate the matched Candidate's profile or shared CV.
 select count(*),min(c.id::text)::uuid into matches,candidate from public.candidates c
  where c.organisation_id=ticket.organisation_id and lower(btrim(c.email))=ticket.normalized_email;
 if matches>1 then raise exception 'Submission unavailable' using errcode='22023'; end if;
 if exists(select 1 from public.application_cvs where application_id=ticket.id) then
  raise exception 'Submission unavailable' using errcode='23505'; end if;
 if candidate is null then
  insert into public.candidates(organisation_id,full_name,email,phone,linkedin_url)
  values(ticket.organisation_id,btrim(full_name),ticket.normalized_email,nullif(btrim(phone),''),linkedin_url) returning id into candidate;
 end if;
 insert into public.applications(id,organisation_id,candidate_id,job_id,source,stage,assessment_status)
 values(ticket.id,ticket.organisation_id,candidate,ticket.job_id,'public','applied','pending');
 insert into public.application_cvs(application_id,organisation_id,job_id,normalized_email,submitted_full_name,submitted_phone,submitted_linkedin_url,object_id,byte_size)
 values(ticket.id,ticket.organisation_id,ticket.job_id,ticket.normalized_email,full_name,phone,linkedin_url,ticket.object_id,ticket.byte_size);
 return jsonb_build_object('application_id',ticket.id,'cv_object_id',ticket.object_id,
  'job_content_version',j.content_version,'title',j.title,'description',j.description);
end $$;
revoke all on function public.prepare_public_application(text,uuid,text,integer),public.complete_public_application(uuid,text,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.prepare_public_application(text,uuid,text,integer),public.complete_public_application(uuid,text,text,text,text) to service_role;

-- Existing rows keep their Candidate source; no historical versions are rewritten.
alter table public.candidate_assessments add column cv_source text not null default 'candidate'
 check(cv_source in ('candidate','application'));
drop policy candidate_assessments_select on public.candidate_assessments;
create policy candidate_assessments_select on public.candidate_assessments for select to authenticated
 using(exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id and j.organisation_id=a.organisation_id
 where a.id=application_id and a.organisation_id=candidate_assessments.organisation_id and j.content_version=job_content_version
 and ((a.source='manual' and cv_source='candidate' and exists(select 1 from public.candidate_cvs cv where cv.candidate_id=a.candidate_id and cv.organisation_id=a.organisation_id and cv.object_id=cv_object_id))
 or (a.source='public' and cv_source='application' and exists(select 1 from public.application_cvs cv where cv.application_id=a.id and cv.organisation_id=a.organisation_id and cv.object_id=cv_object_id)))));
create or replace function private.stale_cv_assessments()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.object_id is distinct from old.object_id then
  update public.applications set assessment_status='stale'
  where candidate_id=new.candidate_id and organisation_id=new.organisation_id and source='manual'
   and assessment_status in ('pending','completed','failed');
 end if;
 return new;
end $$;
create function private.persist_assessment(target_application_id uuid, target_cv_object_id uuid, target_job_content_version integer, validated_result jsonb, failed boolean default false, require_pending boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; target public.applications%rowtype; current_version uuid; current_job_version integer; item jsonb; field text;
begin
 select a.* into target from public.applications a where a.id=target_application_id;
 if not found then raise exception 'Application unavailable' using errcode='22023'; end if;
 -- Relationships are immutable to callers. Lock inputs before updating status;
 -- concurrent edits either wait then stale this result, or fail version checks.
 select j.content_version into current_job_version from public.jobs j
   where j.id=target.job_id and j.organisation_id=target.organisation_id for share;
 if not found or current_job_version is distinct from target_job_content_version then raise exception 'Job changed' using errcode='22023'; end if;
 -- Existing Application composite FKs guarantee Candidate/Job tenant agreement.
 if target.source='public' then
  select cv.object_id into current_version from public.application_cvs cv
   where cv.application_id=target.id and cv.organisation_id=target.organisation_id for share;
 else
  select cv.object_id into current_version from public.candidate_cvs cv
   where cv.candidate_id=target.candidate_id and cv.organisation_id=target.organisation_id for share;
 end if;
 if current_version is null or current_version is distinct from target_cv_object_id then raise exception 'CV changed' using errcode='22023'; end if;
 if require_pending then
  perform 1 from public.applications where id=target.id and source='public' and assessment_status='pending' for update;
  if not found then raise exception 'Assessment unavailable' using errcode='22023'; end if;
 end if;
 if failed then
  update public.applications set assessment_status='failed' where id=target.id and assessment_status='pending';
  return target.id;
 end if;
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
 insert into public.candidate_assessments(application_id,organisation_id,cv_object_id,job_content_version,result,cv_source)
 values(target.id,target.organisation_id,current_version,current_job_version,validated_result,case when target.source='public' then 'application' else 'candidate' end)
 on conflict(application_id) do update set cv_source=excluded.cv_source,cv_object_id=excluded.cv_object_id,job_content_version=excluded.job_content_version,result=excluded.result,assessed_at=now();
 update public.applications set assessment_status='completed' where id=target.id and organisation_id=target.organisation_id;
 return target.id;
end;
$$;
revoke all on function private.persist_assessment(uuid,uuid,integer,jsonb,boolean,boolean) from public,anon,authenticated,service_role;
create or replace function public.save_candidate_assessment(target_application_id uuid,target_cv_object_id uuid,target_job_content_version integer,validated_result jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.profiles%rowtype; target public.applications%rowtype;
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
 return private.persist_assessment(target_application_id,target_cv_object_id,target_job_content_version,validated_result,false);
end $$;

-- The service boundary can only finish a pending public Application assessment.
create function public.finish_public_assessment(target_application_id uuid,target_cv_object_id uuid,target_job_content_version integer,validated_result jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.applications where id=target_application_id and source='public' and assessment_status='pending') then
  raise exception 'Assessment unavailable' using errcode='22023'; end if;
 return private.persist_assessment(target_application_id,target_cv_object_id,target_job_content_version,validated_result,validated_result is null,true);
end $$;
revoke all on function public.finish_public_assessment(uuid,uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.finish_public_assessment(uuid,uuid,integer,jsonb) to service_role;
alter function private.can_read_application_cv(text) owner to postgres;
alter function public.prepare_public_application(text,uuid,text,integer) owner to postgres;
alter function public.complete_public_application(uuid,text,text,text,text) owner to postgres;
alter function private.persist_assessment(uuid,uuid,integer,jsonb,boolean,boolean) owner to postgres;
alter function public.finish_public_assessment(uuid,uuid,integer,jsonb) owner to postgres;
commit;
