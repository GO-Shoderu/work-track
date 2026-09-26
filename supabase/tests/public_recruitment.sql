-- Phase 1 acceptance. Run with psql as postgres after migration review.
-- Four disposable confirmed Auth identities without profiles: owner_id, admin_id,
-- customer_a_id, customer_b_id. Never use real users. No Auth or Storage writes.
-- All fixture writes roll back. No provider calls. Local PostgreSQL mocks can
-- verify schema/RLS, but do not prove managed Supabase/Storage HTTP behaviour.
\set ON_ERROR_STOP on
begin;
select set_config('test.owner',:'owner_id',true),set_config('test.admin',:'admin_id',true),
 set_config('test.ca',:'customer_a_id',true),set_config('test.cb',:'customer_b_id',true),
 set_config('test.a',gen_random_uuid()::text,true),set_config('test.b',gen_random_uuid()::text,true),
 set_config('test.candidate',gen_random_uuid()::text,true),set_config('test.job',gen_random_uuid()::text,true),
 set_config('test.app',gen_random_uuid()::text,true),set_config('test.version',gen_random_uuid()::text,true);
do $$ declare ids uuid[]:=array[current_setting('test.owner')::uuid,current_setting('test.admin')::uuid,current_setting('test.ca')::uuid,current_setting('test.cb')::uuid];begin
 if (select count(distinct id) from unnest(ids) id)<>4 or (select count(*) from auth.users where id=any(ids) and email_confirmed_at is not null)<>4 or exists(select 1 from public.profiles where id=any(ids)) then raise exception 'Four disposable confirmed Auth identities without profiles required';end if;
end $$;
insert into public.organisations(id,name) values(current_setting('test.a')::uuid,'CV fixture A'),(current_setting('test.b')::uuid,'CV fixture B');
insert into public.profiles(id,full_name,role,organisation_id) values
 (:'owner_id','CV owner','platform_owner',null),(:'admin_id','CV admin','admin',null),
 (:'customer_a_id','CV A','customer',current_setting('test.a')::uuid),(:'customer_b_id','CV B','customer',current_setting('test.b')::uuid);
insert into public.admin_organisation_assignments(admin_id,organisation_id) values(:'admin_id',current_setting('test.a')::uuid);
insert into public.candidates(id,organisation_id,full_name) values(current_setting('test.candidate')::uuid,current_setting('test.a')::uuid,'CV fixture');
insert into public.jobs(id,organisation_id,title) values(current_setting('test.job')::uuid,current_setting('test.a')::uuid,'Engineer');
insert into public.applications(id,organisation_id,candidate_id,job_id) values(current_setting('test.app')::uuid,current_setting('test.a')::uuid,current_setting('test.candidate')::uuid,current_setting('test.job')::uuid);
create function pg_temp.actor(subject text) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claim.sub',coalesce(subject,''),true);perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated')::text,true);
end $$;
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;end $$;
create function pg_temp.expect_error(statement text,expected text) returns void language plpgsql as $$begin
 begin execute statement;exception when others then if sqlstate=expected then return;end if;raise exception 'Unexpected SQLSTATE %, expected %',sqlstate,expected;end;
 raise exception 'Expected SQLSTATE %',expected;
end $$;
select set_config('test.result','{"score":70,"summary":"Relevant technical experience.","strengths":["SQL"],"gaps":[],"recommendation":"potential_match","disclaimer":"AI-assisted assessment. Human recruiter judgement is required. This is not a hiring decision."}',true);
select pg_temp.assert_ok((select count(distinct careers_slug)=2 and bool_and(careers_slug ~ '^org-[a-f0-9]{32}$') from public.organisations where id in(current_setting('test.a')::uuid,current_setting('test.b')::uuid)),'safe unique default slugs');
select pg_temp.expect_error($q$update public.organisations set careers_slug='Bad Slug' where id=current_setting('test.a')::uuid$q$,'23514');
select pg_temp.expect_error($q$update public.organisations set careers_slug=(select careers_slug from public.organisations where id=current_setting('test.a')::uuid) where id=current_setting('test.b')::uuid$q$,'23505');
select set_config('test.public_id',(select public_id::text from public.jobs where id=current_setting('test.job')::uuid),true);
select pg_temp.expect_error($q$update public.jobs set public_id=gen_random_uuid() where id=current_setting('test.job')::uuid$q$,'22023');
select pg_temp.assert_ok(not private.job_is_publicly_open('draft',null) and not private.job_is_publicly_open('closed',null) and not private.job_is_publicly_open('archived',null),'only published can open');
select pg_temp.assert_ok(private.job_is_publicly_open('published',null) and private.job_is_publicly_open('published',statement_timestamp()+interval '1 day') and not private.job_is_publicly_open('published',statement_timestamp()) and not private.job_is_publicly_open('published',statement_timestamp()-interval '1 day'),'deadline strict boundary');
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
select pg_temp.assert_ok((select status='draft' and content_version=1 and description_rich is null and teaser is null and updated_at is null from public.jobs where id=current_setting('test.job')::uuid),'safe Job defaults');
select pg_temp.assert_ok((select source='manual' and removed_at is null and assessment_status='not_ready' and stage='applied' from public.applications where id=current_setting('test.app')::uuid),'Application defaults');
update public.jobs set status='published' where id=current_setting('test.job')::uuid;
select pg_temp.assert_ok((select published_at is not null and updated_at is not null and content_version=1 and private.job_is_publicly_open(status,closes_at) from public.jobs where id=current_setting('test.job')::uuid),'publication timestamps, no content bump');
update public.jobs set closes_at=now()-interval '1 day' where id=current_setting('test.job')::uuid;
select pg_temp.assert_ok((select not private.job_is_publicly_open(status,closes_at) from public.jobs where id=current_setting('test.job')::uuid),'expired published Job is closed to applicants');
update public.jobs set status='closed' where id=current_setting('test.job')::uuid;
select pg_temp.assert_ok((select closed_at is not null and content_version=1 from public.jobs where id=current_setting('test.job')::uuid),'close timestamp');
update public.jobs set status='archived' where id=current_setting('test.job')::uuid;
update public.jobs set status='published',closes_at=null where id=current_setting('test.job')::uuid;
select pg_temp.assert_ok((select closed_at is null and public_id=current_setting('test.public_id')::uuid and content_version=1 from public.jobs where id=current_setting('test.job')::uuid),'stable URL after reopen');
update public.applications set stage='interview',removed_at=now() where id=current_setting('test.app')::uuid;
select pg_temp.assert_ok((select removed_at is not null and stage='interview' from public.applications where id=current_setting('test.app')::uuid),'pipeline removal retains stage and row');
update public.applications set removed_at=null where id=current_setting('test.app')::uuid;
select pg_temp.assert_ok((select removed_at is null and stage='interview' from public.applications where id=current_setting('test.app')::uuid),'pipeline restoration');
select pg_temp.assert_ok(exists(select 1 from public.candidates where id=current_setting('test.candidate')::uuid),'Candidate retained');
select pg_temp.expect_error('delete from public.applications','42501');
select pg_temp.expect_error('update public.jobs set content_version=999','42501');
select pg_temp.expect_error('update public.jobs set public_id=gen_random_uuid()','42501');
select pg_temp.expect_error('update public.jobs set published_at=now()','42501');
select pg_temp.expect_error($q$update public.applications set source='public'$q$,'42501');
select pg_temp.expect_error($q$update public.applications set assessment_status='completed'$q$,'42501');
select pg_temp.expect_error($q$update public.jobs set organisation_id=current_setting('test.b')::uuid$q$,'42501');
select pg_temp.assert_ok(not has_column_privilege('authenticated','public.jobs','description_rich','UPDATE'),'no authenticated rich-content UPDATE grant');
select pg_temp.expect_error($q$update public.jobs set description_rich='{"type":"doc","content":[]}' where id=current_setting('test.job')::uuid$q$,'42501');
insert into public.candidate_cvs(candidate_id,organisation_id,object_id,byte_size) values(current_setting('test.candidate')::uuid,current_setting('test.a')::uuid,current_setting('test.version')::uuid,100);
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,1,current_setting('test.result')::jsonb);
select pg_temp.assert_ok((select assessment_status='completed' and stage='interview' from public.applications where id=current_setting('test.app')::uuid),'assessment completion, no stage change');
update public.jobs set description=E'  \n ' where id=current_setting('test.job')::uuid;
select pg_temp.assert_ok((select content_version=1 from public.jobs where id=current_setting('test.job')::uuid),'blank/null whitespace equivalence');
update public.jobs set title='Senior Engineer',description='PostgreSQL required' where id=current_setting('test.job')::uuid;
select pg_temp.assert_ok((select content_version=2 from public.jobs where id=current_setting('test.job')::uuid),'one bump for title and description');
select pg_temp.assert_ok((select assessment_status='stale' and stage='interview' from public.applications where id=current_setting('test.app')::uuid),'Job edit stales status without stage change');
select pg_temp.assert_ok(not exists(select 1 from public.candidate_assessments where application_id=current_setting('test.app')::uuid),'Job stale assessment hidden');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,1,current_setting('test.result')::jsonb)$q$,'22023');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,null,current_setting('test.result')::jsonb)$q$,'22023');
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,2,current_setting('test.result')::jsonb);
update public.jobs set title='Senior  Engineer',description=E'PostgreSQL\n required ' where id=current_setting('test.job')::uuid;
select pg_temp.assert_ok((select content_version=2 from public.jobs where id=current_setting('test.job')::uuid),'whitespace edits do not bump');
select pg_temp.assert_ok(exists(select 1 from public.candidate_assessments where application_id=current_setting('test.app')::uuid),'whitespace preserves assessment');
-- Database-owner fixture write retains coverage of rich-content invalidation.
-- No authenticated rich-content write boundary exists in Phase 1.
reset role;
select pg_temp.expect_error($q$update public.jobs set description_rich='[]' where id=current_setting('test.job')::uuid$q$,'23514');
update public.jobs set description_rich='{"type":"doc","content":[]}' where id=current_setting('test.job')::uuid;
set local role authenticated;
select pg_temp.assert_ok((select content_version=3 from public.jobs where id=current_setting('test.job')::uuid),'rich document change conservatively bumps');
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,3,current_setting('test.result')::jsonb);
update public.candidate_cvs set object_id=gen_random_uuid() where candidate_id=current_setting('test.candidate')::uuid;
select pg_temp.assert_ok(not exists(select 1 from public.candidate_assessments where application_id=current_setting('test.app')::uuid),'CV stale assessment hidden');
select pg_temp.assert_ok((select assessment_status='stale' and stage='interview' from public.applications where id=current_setting('test.app')::uuid),'CV replacement stales status without stage change');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,3,current_setting('test.result')::jsonb)$q$,'22023');
select set_config('test.version',(select object_id::text from public.candidate_cvs where candidate_id=current_setting('test.candidate')::uuid),true);
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,3,current_setting('test.result')::jsonb);
select pg_temp.actor(current_setting('test.cb'));
select pg_temp.assert_ok(not exists(select 1 from public.jobs where id=current_setting('test.job')::uuid),'Customer B cannot read published A Job');
with changed as (update public.jobs set status='closed' where id=current_setting('test.job')::uuid returning id) select pg_temp.assert_ok(not exists(select 1 from changed),'Customer B cannot update A Job lifecycle');
with changed as (update public.applications set removed_at=now() where id=current_setting('test.app')::uuid returning id) select pg_temp.assert_ok(not exists(select 1 from changed),'Customer B cannot remove A Application');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,3,current_setting('test.result')::jsonb)$q$,'42501');
select pg_temp.actor(current_setting('test.admin'));
update public.jobs set status='closed' where id=current_setting('test.job')::uuid;
select pg_temp.assert_ok((select status='closed' from public.jobs where id=current_setting('test.job')::uuid),'assigned Admin edits');
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,3,current_setting('test.result')::jsonb);
reset role;
delete from public.admin_organisation_assignments where admin_id=:'admin_id';
set local role authenticated;
with changed as (update public.jobs set status='published' where id=current_setting('test.job')::uuid returning id) select pg_temp.assert_ok(not exists(select 1 from changed),'revoked Admin cannot edit');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,3,current_setting('test.result')::jsonb)$q$,'42501');
select pg_temp.actor(current_setting('test.owner'));
update public.jobs set status='published' where id=current_setting('test.job')::uuid;
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,3,current_setting('test.result')::jsonb);
select pg_temp.actor(null);
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,3,current_setting('test.result')::jsonb)$q$,'42501');
reset role;
-- Stale output is retained physically, while RLS hides it from normal actors.
select pg_temp.assert_ok((select count(*)=1 from public.candidate_assessments where application_id=current_setting('test.app')::uuid),'latest assessment retained');
select pg_temp.assert_ok(to_regprocedure('public.save_candidate_assessment(uuid,uuid,jsonb)') is null,'unsafe old overload removed');
select pg_temp.assert_ok((select public=false and file_size_limit=5242880 and allowed_mime_types=array['application/pdf'] from storage.buckets where id='candidate-cvs'),'CV bucket unchanged and private');
do $$ declare r text;t text;begin
 foreach r in array array['anon','service_role'] loop
  foreach t in array array['jobs','applications','candidate_assessments','candidate_cvs'] loop
   if has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or has_any_column_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,REFERENCES') then raise exception 'Unexpected ACL % %',r,t;end if;
  end loop;
  if has_function_privilege(r,'public.save_candidate_assessment(uuid,uuid,integer,jsonb)','EXECUTE') then raise exception 'Unsafe RPC ACL';end if;
 end loop;
 if has_any_column_privilege('authenticated','public.candidate_assessments','INSERT,UPDATE') then raise exception 'Direct assessment writes granted';end if;
end $$;
rollback;
\echo PASS: public recruitment acceptance rolled back
