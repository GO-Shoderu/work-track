-- Phase 2B LOCAL transactional acceptance; psql as postgres.
-- Storage metadata fixtures below are rolled back; no physical objects are uploaded.
-- Four disposable confirmed Auth identities without profiles: owner_id, admin_id,
-- customer_a_id, customer_b_id. No Auth writes. Local Storage metadata fixtures roll back.
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

update public.organisations set careers_slug='submission-test-a' where id=current_setting('test.a')::uuid;
update public.organisations set careers_slug='submission-test-b' where id=current_setting('test.b')::uuid;
update public.jobs set status='published',description='Build reliable software' where id=current_setting('test.job')::uuid;
update public.candidates set email='Existing@Example.com',full_name='Retained name' where id=current_setting('test.candidate')::uuid;
insert into public.candidate_cvs(candidate_id,organisation_id,object_id,byte_size)
 values(current_setting('test.candidate')::uuid,current_setting('test.a')::uuid,current_setting('test.version')::uuid,100);
select set_config('test.public',(select public_id::text from public.jobs where id=current_setting('test.job')::uuid),true);
select set_config('test.jv',(select content_version::text from public.jobs where id=current_setting('test.job')::uuid),true);
-- Existing manual assessment remains valid across this migration's source distinction.
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.jv')::integer,current_setting('test.result')::jsonb);
select pg_temp.assert_ok((select cv_source='candidate' from public.candidate_assessments where application_id=current_setting('test.app')::uuid),'Manual source unchanged');
reset role;

-- Service admission rejects closed/expired and cross-tenant identifiers.
set local role service_role;
select pg_temp.expect_error($q$select public.prepare_public_application('submission-test-b',current_setting('test.public')::uuid,'new@example.com',100)$q$,'22023');
select pg_temp.expect_error($q$select public.prepare_public_application('submission-test-a',current_setting('test.public')::uuid,'bad-email',100)$q$,'22023');
select pg_temp.expect_error($q$select public.prepare_public_application('submission-test-a',current_setting('test.public')::uuid,'new@example.com',5242881)$q$,'22023');
select set_config('test.ticket',public.prepare_public_application('submission-test-a',current_setting('test.public')::uuid,' New@Example.com ',100)::text,true);
select set_config('test.newapp',(current_setting('test.ticket')::jsonb->>'id'),true);
select set_config('test.newcv',(current_setting('test.ticket')::jsonb->>'object_id'),true);
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.newapp')::uuid,'New Person','new@example.com',null,null)$q$,'22023');
reset role;
select pg_temp.assert_ok(not exists(select 1 from public.applications where id=current_setting('test.newapp')::uuid),'No Application without Storage');
insert into storage.objects(bucket_id,name,metadata) values('candidate-cvs',current_setting('test.a')||'/applications/'||current_setting('test.newapp')||'/'||current_setting('test.newcv')||'.pdf','{"mimetype":"application/pdf","size":100}');
set local role service_role;
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.newapp')::uuid,'','new@example.com',null,null)$q$,'22023');
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.newapp')::uuid,'New Person','other@example.com',null,null)$q$,'22023');
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.newapp')::uuid,'New Person','new@example.com',null,'https://evil.test')$q$,'22023');
select public.complete_public_application(current_setting('test.newapp')::uuid,'New Person','new@example.com',null,null);
reset role;
select pg_temp.assert_ok((select source='public' and stage='applied' and assessment_status='pending' from public.applications where id=current_setting('test.newapp')::uuid),'Public source/applied/pending');
select pg_temp.assert_ok((select count(*)=1 from public.application_cvs where application_id=current_setting('test.newapp')::uuid),'Required immutable CV association');
select pg_temp.assert_ok((select submitted_full_name='New Person' and normalized_email='new@example.com' and submitted_phone is null and submitted_linkedin_url is null from public.application_cvs where application_id=current_setting('test.newapp')::uuid),'New Candidate retains contact snapshot');
select pg_temp.assert_ok(not exists(select 1 from public.candidate_cvs where candidate_id=(select candidate_id from public.applications where id=current_setting('test.newapp')::uuid)),'No shared CV for new public Candidate');

set local role service_role;
select pg_temp.expect_error($q$select public.finish_public_assessment(current_setting('test.newapp')::uuid,current_setting('test.version')::uuid,current_setting('test.jv')::integer,current_setting('test.result')::jsonb)$q$,'22023');
select public.finish_public_assessment(current_setting('test.newapp')::uuid,current_setting('test.newcv')::uuid,current_setting('test.jv')::integer,null);
reset role;
select pg_temp.assert_ok((select stage='applied' and assessment_status='failed' from public.applications where id=current_setting('test.newapp')::uuid),'AI failure preserves Application/stage');
-- Authenticated retry uses the Application CV, not the Candidate CV.
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
select public.save_candidate_assessment(current_setting('test.newapp')::uuid,current_setting('test.newcv')::uuid,current_setting('test.jv')::integer,current_setting('test.result')::jsonb);
select pg_temp.assert_ok((select cv_source='application' from public.candidate_assessments where application_id=current_setting('test.newapp')::uuid),'Application CV assessment visible');
reset role;

-- Helper mimics a validated server upload using transactional Storage metadata.
-- It is test-only, executed as postgres; production never writes Storage SQL.
create function pg_temp.upload_for(email text, job_public uuid default null, slug text default 'submission-test-a') returns uuid language plpgsql as $$
declare ticket jsonb;
begin
 ticket:=public.prepare_public_application(slug,coalesce(job_public,current_setting('test.public')::uuid),email,100);
 insert into storage.objects(bucket_id,name,metadata) values('candidate-cvs',(ticket->>'organisation_id')||'/applications/'||(ticket->>'id')||'/'||(ticket->>'object_id')||'.pdf','{"mimetype":"application/pdf","size":100}');
 return (ticket->>'id')::uuid;
end $$;
select set_config('test.duplicate',pg_temp.upload_for('NEW@example.com')::text,true);
set local role service_role;
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.duplicate')::uuid,'Other name','new@example.com',null,null)$q$,'23505');
reset role;
select pg_temp.assert_ok((select count(*)=1 from public.candidates where organisation_id=current_setting('test.a')::uuid and lower(email)='new@example.com'),'Duplicate does not create Candidate');
select pg_temp.assert_ok(not exists(select 1 from public.applications where id=current_setting('test.duplicate')::uuid),'Duplicate does not persist Application');

-- A second Job reuses the retained Candidate but never its shared CV/profile.
insert into public.jobs(organisation_id,title,description,status) values(current_setting('test.a')::uuid,'Second Job','Meaningful description','published');
select set_config('test.secondjob',(select public_id::text from public.jobs where organisation_id=current_setting('test.a')::uuid and title='Second Job'),true);
select set_config('test.canonical',(select to_jsonb(c)::text from public.candidates c where id=current_setting('test.candidate')::uuid),true);
select set_config('test.reuse',pg_temp.upload_for('existing@example.com',current_setting('test.secondjob')::uuid)::text,true);
set local role service_role;
select public.complete_public_application(current_setting('test.reuse')::uuid,' Untrusted replacement ',' Existing@Example.com ',' 123 ','https://www.linkedin.com/in/submitted-person');
reset role;
select pg_temp.assert_ok((select candidate_id=current_setting('test.candidate')::uuid from public.applications where id=current_setting('test.reuse')::uuid),'Same Organisation Candidate reused');
select pg_temp.assert_ok((select to_jsonb(c)=current_setting('test.canonical')::jsonb from public.candidates c where id=current_setting('test.candidate')::uuid),'Entire canonical Candidate profile preserved');
select pg_temp.assert_ok((select submitted_full_name=' Untrusted replacement ' and normalized_email='existing@example.com' and submitted_phone=' 123 ' and submitted_linkedin_url='https://www.linkedin.com/in/submitted-person' from public.application_cvs where application_id=current_setting('test.reuse')::uuid),'Reused Candidate retains verbatim Application contact snapshot');
select pg_temp.assert_ok((select object_id=current_setting('test.version')::uuid from public.candidate_cvs where candidate_id=current_setting('test.candidate')::uuid),'Shared CV preserved');
select set_config('test.reusecv',(select object_id::text from public.application_cvs where application_id=current_setting('test.reuse')::uuid),true);
set local role service_role;
select public.finish_public_assessment(current_setting('test.reuse')::uuid,current_setting('test.reusecv')::uuid,1,current_setting('test.result')::jsonb);
reset role;
select pg_temp.assert_ok((select assessment_status='completed' and stage='applied' from public.applications where id=current_setting('test.reuse')::uuid),'Automatic completed preserves stage');
-- Another public Job for that Candidate gets another exact immutable CV.
insert into public.jobs(organisation_id,title,description,status) values(current_setting('test.a')::uuid,'Third Job','Meaningful description','published');
select set_config('test.third',pg_temp.upload_for('existing@example.com',(select public_id from public.jobs where organisation_id=current_setting('test.a')::uuid and title='Third Job'))::text,true);
set local role service_role;
select public.complete_public_application(current_setting('test.third')::uuid,'Another name','existing@example.com',null,null);
reset role;
select pg_temp.assert_ok((select candidate_id=current_setting('test.candidate')::uuid from public.applications where id=current_setting('test.third')::uuid),'Candidate reused across Jobs');
select pg_temp.assert_ok((select object_id<>current_setting('test.reusecv')::uuid from public.application_cvs where application_id=current_setting('test.third')::uuid),'Distinct Application CV per Job');

update public.candidate_cvs set object_id=gen_random_uuid() where candidate_id=current_setting('test.candidate')::uuid;
select pg_temp.assert_ok((select assessment_status='stale' from public.applications where id=current_setting('test.app')::uuid),'Manual CV replacement stales manual assessment');
select pg_temp.assert_ok((select assessment_status='completed' from public.applications where id=current_setting('test.reuse')::uuid),'Shared CV replacement does not stale public assessment');
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
select pg_temp.assert_ok(exists(select 1 from public.candidate_assessments where application_id=current_setting('test.reuse')::uuid),'Public result remains current');
select pg_temp.assert_ok(not exists(select 1 from public.candidate_assessments where application_id=current_setting('test.app')::uuid),'Manual stale result hidden');
reset role;
update public.jobs set description='Changed substantive content' where public_id=current_setting('test.secondjob')::uuid;
select pg_temp.assert_ok((select assessment_status='stale' from public.applications where id=current_setting('test.reuse')::uuid),'Job edit stales public assessment');
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
select pg_temp.assert_ok(not exists(select 1 from public.candidate_assessments where application_id=current_setting('test.reuse')::uuid),'Stale public result hidden');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.reuse')::uuid,current_setting('test.reusecv')::uuid,1,current_setting('test.result')::jsonb)$q$,'22023');
reset role;

-- Equal email in another Organisation creates a separate Candidate.
insert into public.jobs(organisation_id,title,description,status) values(current_setting('test.b')::uuid,'Other Tenant Job','Meaningful description','published');
select set_config('test.foreign',pg_temp.upload_for('existing@example.com',(select public_id from public.jobs where organisation_id=current_setting('test.b')::uuid),'submission-test-b')::text,true);
set local role service_role;
select public.complete_public_application(current_setting('test.foreign')::uuid,'Separate Candidate','existing@example.com',null,null);
reset role;
select pg_temp.assert_ok((select candidate_id<>current_setting('test.candidate')::uuid and organisation_id=current_setting('test.b')::uuid from public.applications where id=current_setting('test.foreign')::uuid),'Candidate reuse tenant isolated');

-- RLS and immutable Storage: own tenant reads, cross-tenant/revoked Admin denial.
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
select pg_temp.assert_ok(exists(select 1 from public.application_cvs where application_id=current_setting('test.reuse')::uuid),'Own tenant CV readable');
select pg_temp.expect_error($q$update public.application_cvs set submitted_full_name='Changed' where application_id=current_setting('test.reuse')::uuid$q$,'42501');
select pg_temp.expect_error($q$update public.application_cvs set submitted_phone='Changed' where application_id=current_setting('test.reuse')::uuid$q$,'42501');
select pg_temp.assert_ok(not exists(select 1 from public.application_cvs where application_id=current_setting('test.foreign')::uuid),'Foreign CV hidden');
select pg_temp.assert_ok(exists(select 1 from storage.objects where name=current_setting('test.a')||'/applications/'||current_setting('test.reuse')||'/'||current_setting('test.reusecv')||'.pdf'),'Private own CV Storage read');
select pg_temp.expect_error($q$insert into storage.objects(bucket_id,name) values('candidate-cvs',current_setting('test.a')||'/applications/'||current_setting('test.reuse')||'/'||gen_random_uuid()::text||'.pdf')$q$,'42501');
with deleted as (delete from storage.objects where name like '%/applications/%' returning 1) select pg_temp.assert_ok(count(*)=0,'Cannot delete immutable public CV') from deleted;
reset role;
select pg_temp.actor(current_setting('test.admin'));
set local role authenticated;
select pg_temp.assert_ok(exists(select 1 from public.application_cvs where application_id=current_setting('test.reuse')::uuid),'Assigned Admin reads CV');
reset role;
delete from public.admin_organisation_assignments where admin_id=current_setting('test.admin')::uuid;
set local role authenticated;
select pg_temp.assert_ok(not exists(select 1 from public.application_cvs),'Revoked Admin cannot read CV');
reset role;
select pg_temp.actor(current_setting('test.owner'));
set local role authenticated;
select pg_temp.assert_ok(exists(select 1 from public.application_cvs where application_id=current_setting('test.foreign')::uuid),'Owner reads CV');
reset role;

-- Privileged writes are service-only, including the private helper.
select pg_temp.assert_ok(not has_table_privilege('anon','public.application_cvs','select,insert,update,delete'),'No anonymous CV table access');
select pg_temp.assert_ok(not has_table_privilege('authenticated','public.application_cvs','insert,update,delete'),'No authenticated CV table writes');
select pg_temp.assert_ok(not has_table_privilege('service_role','public.applications','insert,update,delete'),'No broad service Application writes');
select pg_temp.assert_ok(not has_function_privilege(role_name,fn,'execute'),'Privileged RPC denied')
 from unnest(array['anon','authenticated']) role_name cross join unnest(array['public.prepare_public_application(text,uuid,text,integer)','public.complete_public_application(uuid,text,text,text,text)','public.finish_public_assessment(uuid,uuid,integer,jsonb)','private.persist_assessment(uuid,uuid,integer,jsonb,boolean,boolean)']) fn;
set local role anon;
select pg_temp.expect_error($q$select public.prepare_public_application('submission-test-a',current_setting('test.public')::uuid,'a@example.com',100)$q$,'42501');
select pg_temp.assert_ok(not exists(select 1 from storage.objects where bucket_id='candidate-cvs'),'Anonymous cannot read private CVs');
reset role;
select pg_temp.assert_ok((select not public from storage.buckets where id='candidate-cvs'),'Bucket stays private');
-- Submission eligibility is checked again after upload, not just at discovery.
select set_config('test.closedticket',pg_temp.upload_for('closing@example.com')::text,true);
update public.jobs set status='closed' where id=current_setting('test.job')::uuid;
set local role service_role;
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.closedticket')::uuid,'Person','closing@example.com',null,null)$q$,'22023');
reset role;
do $$ declare state public.job_status; begin
 foreach state in array array['draft','closed','archived']::public.job_status[] loop
  update public.jobs set status=state where id=current_setting('test.job')::uuid;
  perform pg_temp.expect_error($q$select public.prepare_public_application('submission-test-a',current_setting('test.public')::uuid,'hidden@example.com',100)$q$,'22023');
 end loop;
end $$;
update public.jobs set status='published',closes_at=clock_timestamp()-interval '1 second' where id=current_setting('test.job')::uuid;
select pg_temp.expect_error($q$select public.prepare_public_application('submission-test-a',current_setting('test.public')::uuid,'expired@example.com',100)$q$,'22023');
update public.jobs set closes_at=null where id=current_setting('test.job')::uuid;
select set_config('test.manualduplicate',pg_temp.upload_for('existing@example.com')::text,true);
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.manualduplicate')::uuid,'Person','existing@example.com',null,null)$q$,'23505');
-- Ambiguous legacy email matches never mutate or arbitrarily choose a Candidate.
insert into public.candidates(organisation_id,full_name,email) values
 (current_setting('test.a')::uuid,'Ambiguous 1','ambiguous@example.com'),
 (current_setting('test.a')::uuid,'Ambiguous 2','AMBIGUOUS@example.com');
select set_config('test.ambiguous',pg_temp.upload_for('ambiguous@example.com')::text,true);
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.ambiguous')::uuid,'Person','ambiguous@example.com',null,null)$q$,'22023');
-- Metadata mismatch and expired reservation are both safe failures.
select set_config('test.invalidstorage',pg_temp.upload_for('metadata@example.com')::text,true);
update storage.objects set metadata='{"size":99,"mimetype":"application/pdf"}' where name like '%/'||current_setting('test.invalidstorage')||'/%';
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.invalidstorage')::uuid,'Person','metadata@example.com',null,null)$q$,'22023');
select set_config('test.oldticket',pg_temp.upload_for('old@example.com')::text,true);
update private.public_application_uploads set created_at=clock_timestamp()-interval '16 minutes' where id=current_setting('test.oldticket')::uuid;
select pg_temp.expect_error($q$select public.complete_public_application(current_setting('test.oldticket')::uuid,'Person','old@example.com',null,null)$q$,'22023');
-- Durable per-email admission limit is shared across processes, before upload.
select public.prepare_public_application('submission-test-a',current_setting('test.public')::uuid,'limited@example.com',100) from generate_series(1,3);
select pg_temp.expect_error($q$select public.prepare_public_application('submission-test-a',current_setting('test.public')::uuid,'limited@example.com',100)$q$,'22023');
select pg_temp.assert_ok(not exists(select 1 from public.applications where id in (current_setting('test.closedticket')::uuid,current_setting('test.ambiguous')::uuid,current_setting('test.invalidstorage')::uuid,current_setting('test.oldticket')::uuid)),'Failures never persist an Application');
-- Snapshot is required and bounded even at the privileged database boundary.
select pg_temp.expect_error($q$update public.application_cvs set submitted_full_name=null where application_id=current_setting('test.reuse')::uuid$q$,'23502');
select pg_temp.expect_error($q$update public.application_cvs set submitted_full_name='' where application_id=current_setting('test.reuse')::uuid$q$,'23514');
select pg_temp.expect_error($q$update public.application_cvs set submitted_linkedin_url='https://evil.test' where application_id=current_setting('test.reuse')::uuid$q$,'23514');
select pg_temp.expect_error($q$update public.application_cvs set application_id=gen_random_uuid() where application_id=current_setting('test.reuse')::uuid$q$,'23503');
select pg_temp.expect_error($q$update public.application_cvs set organisation_id=current_setting('test.b')::uuid where application_id=current_setting('test.reuse')::uuid$q$,'23503');
select pg_temp.assert_ok(not exists(select 1 from public.applications a where a.source='public' and not exists(select 1 from public.application_cvs cv where cv.application_id=a.id and cv.submitted_full_name is not null and cv.normalized_email is not null)),'Every public Application has its own required snapshot');
rollback;
