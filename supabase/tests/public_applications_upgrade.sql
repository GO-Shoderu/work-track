-- DISPOSABLE LOCAL DATABASE ONLY. This two-phase upgrade test commits fixtures.
-- After Phase 2A, run with -v prepare=true -v customer_a_id=<disposable Auth UUID>.
-- Apply the draft Phase 2B migration, then run with -v prepare=false.
-- Destroy the disposable database/container after verification. Never run on managed Supabase.
\set ON_ERROR_STOP on
\if :prepare
begin;
select set_config('test.customer',:'customer_a_id',true),set_config('test.org',gen_random_uuid()::text,true),
 set_config('test.job',gen_random_uuid()::text,true),set_config('test.candidate',gen_random_uuid()::text,true),
 set_config('test.app',gen_random_uuid()::text,true),set_config('test.cv',gen_random_uuid()::text,true);
do $$begin
 if not exists(select 1 from auth.users where id=current_setting('test.customer')::uuid and email_confirmed_at is not null)
 or exists(select 1 from public.profiles where id=current_setting('test.customer')::uuid) then raise exception 'Disposable confirmed Auth user without profile required';end if;
end $$;
insert into public.organisations(id,name) values(current_setting('test.org')::uuid,'Upgrade Organisation');
insert into public.profiles(id,full_name,role,organisation_id) values(current_setting('test.customer')::uuid,'Upgrade Customer','customer',current_setting('test.org')::uuid);
insert into public.jobs(id,organisation_id,title,description) values(current_setting('test.job')::uuid,current_setting('test.org')::uuid,'Retained Job','Retained description');
insert into public.candidates(id,organisation_id,full_name,email,phone,linkedin_url) values(current_setting('test.candidate')::uuid,current_setting('test.org')::uuid,'Retained Candidate','retained@example.com','123','https://www.linkedin.com/in/retained');
insert into public.applications(id,organisation_id,job_id,candidate_id,stage) values(current_setting('test.app')::uuid,current_setting('test.org')::uuid,current_setting('test.job')::uuid,current_setting('test.candidate')::uuid,'interview');
insert into public.candidate_cvs(candidate_id,organisation_id,object_id,byte_size) values(current_setting('test.candidate')::uuid,current_setting('test.org')::uuid,current_setting('test.cv')::uuid,100);
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
set local role authenticated;
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.cv')::uuid,1,
 '{"score":70,"summary":"Retained assessment","strengths":[],"gaps":[],"recommendation":"potential_match","disclaimer":"AI-assisted assessment. Human recruiter judgement is required. This is not a hiring decision."}');
reset role;
create table private.phase2b_upgrade_snapshot as select
 (select to_jsonb(o) from public.organisations o where id=current_setting('test.org')::uuid) organisation,
 (select to_jsonb(j) from public.jobs j where id=current_setting('test.job')::uuid) job,
 (select to_jsonb(c) from public.candidates c where id=current_setting('test.candidate')::uuid) candidate,
 (select to_jsonb(cv) from public.candidate_cvs cv where candidate_id=current_setting('test.candidate')::uuid) cv,
 (select to_jsonb(a) from public.applications a where id=current_setting('test.app')::uuid) application,
 (select to_jsonb(ca) from public.candidate_assessments ca where application_id=current_setting('test.app')::uuid) assessment,
 current_setting('test.customer')::uuid customer_id;
commit;
\else
begin;
do $$declare s private.phase2b_upgrade_snapshot%rowtype;begin
 select * into strict s from private.phase2b_upgrade_snapshot;
 if not exists(select 1 from public.organisations o where to_jsonb(o)=s.organisation)
 or not exists(select 1 from public.jobs j where to_jsonb(j)=s.job)
 or not exists(select 1 from public.candidates c where to_jsonb(c)=s.candidate)
 or not exists(select 1 from public.candidate_cvs cv where to_jsonb(cv)=s.cv)
 or not exists(select 1 from public.applications a where to_jsonb(a)=s.application)
 or not exists(select 1 from public.candidate_assessments ca where to_jsonb(ca)-'cv_source'=s.assessment and ca.cv_source='candidate') then
  raise exception 'Upgrade changed retained data';end if;
 if exists(select 1 from public.application_cvs) then raise exception 'Upgrade fabricated public CV/contact snapshots';end if;
 if (select count(*) from information_schema.columns where table_schema='public' and table_name='application_cvs'
 and column_name in ('submitted_full_name','normalized_email') and is_nullable='NO')<>2 then raise exception 'Required snapshot columns missing';end if;
 perform set_config('request.jwt.claim.sub',s.customer_id::text,true);
end $$;
set local role authenticated;
do $$begin
 if (select count(*) from public.candidate_assessments)<>1 then raise exception 'Legacy assessment no longer visible';end if;
 if not exists(select 1 from public.applications where stage='interview' and assessment_status='completed') then raise exception 'Retained stage/status changed';end if;
end $$;
rollback;
\endif
