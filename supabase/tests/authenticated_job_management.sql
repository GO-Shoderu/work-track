-- Phase 2A review-only transactional acceptance; psql as postgres.
-- Four disposable confirmed Auth identities without profiles: owner_id, admin_id,
-- customer_a_id, customer_b_id. No Auth/Storage writes. All fixtures roll back.
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

select set_config('test.doc','{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Responsibilities"}]},{"type":"paragraph","content":[{"type":"text","text":"Build reliable software.","marks":[{"type":"bold"}]}]}]}',true);
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
-- Exercise SQL validation through the same actor RPC (not just the Zod layer).
create function pg_temp.invalid_document(document jsonb) returns void language plpgsql as $$begin
 begin
  perform public.save_job_content(current_setting('test.a')::uuid,null,'Invalid fixture',document,null,null,true);
 exception when sqlstate '22023' then return; end;
 raise exception 'Invalid document accepted';
end $$;
select pg_temp.invalid_document('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"link","attrs":{"href":"javascript:evil"}}]}]}]}');
select pg_temp.invalid_document('{"type":"doc","content":[{"type":"heading","attrs":{"level":1}}]}');
select pg_temp.invalid_document('{"type":"doc","content":[{"type":"bulletList","content":[{"type":"paragraph"}]}]}');
select pg_temp.invalid_document('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"bold"},{"type":"bold"}]}]}]}');
select pg_temp.invalid_document(jsonb_build_object('type','doc','content',jsonb_build_array(jsonb_build_object('type','paragraph','content',jsonb_build_array(jsonb_build_object('type','text','text',repeat('x',20001)))))));
select pg_temp.invalid_document(jsonb_build_object('type','doc','content',(select jsonb_agg(jsonb_build_object('type','paragraph')) from generate_series(1,101))));
select pg_temp.invalid_document(jsonb_build_object('type','doc','content',(select jsonb_agg(jsonb_build_object('type','paragraph','content',(select jsonb_agg(jsonb_build_object('type','text','text','x')) from generate_series(1,11)))) from generate_series(1,100))));
do $$ declare nested jsonb:='{"type":"paragraph"}';i integer;begin
 for i in 1..5 loop nested:=jsonb_build_object('type','bulletList','content',jsonb_build_array(jsonb_build_object('type','listItem','content',jsonb_build_array(jsonb_build_object('type','paragraph'),nested))));end loop;
 perform pg_temp.invalid_document(jsonb_build_object('type','doc','content',jsonb_build_array(nested)));
end $$;
select public.save_job_content(current_setting('test.a')::uuid,null,'Draft role','{"type":"doc","content":[{"type":"paragraph"}]}',null,null,true) as draft_id \gset
select set_config('test.draft',:'draft_id',true);
select pg_temp.assert_ok((select status='draft' and description='' and content_version=1 from public.jobs where id=:'draft_id'),'create empty draft');
select pg_temp.expect_error($q$select public.transition_job(current_setting('test.a')::uuid,current_setting('test.draft')::uuid,'published')$q$,'22023');
select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Engineer',current_setting('test.doc')::jsonb,now()+interval '1 day',1,true);
select pg_temp.assert_ok((select description=E'Responsibilities\nBuild reliable software.' and description_rich=current_setting('test.doc')::jsonb and content_version=2 and status='draft' from public.jobs where id=current_setting('test.job')::uuid),'derived plain text, rich content and version saved atomically');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Overwrite',current_setting('test.doc')::jsonb,null,1,true)$q$,'40001');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Engineer',current_setting('test.doc')::jsonb,now()-interval '1 second',2,true)$q$,'22023');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Engineer',current_setting('test.doc')::jsonb,'infinity',2,true)$q$,'22023');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,null,'Engineer','{"type":"doc","content":[{"type":"image","attrs":{"src":"https://evil.invalid"}}]}',null,null,true)$q$,'22023');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,null,'Engineer','{"type":"doc","content":[{"type":"paragraph","attrs":{"onclick":"evil"}}]}',null,null,true)$q$,'22023');
select pg_temp.expect_error($q$update public.jobs set description_rich=current_setting('test.doc')::jsonb where id=current_setting('test.job')::uuid$q$,'42501');
select pg_temp.expect_error($q$update public.jobs set status='published' where id=current_setting('test.draft')::uuid$q$,'42501');
select pg_temp.expect_error($q$update public.jobs set description='forged' where id=current_setting('test.job')::uuid$q$,'42501');
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'Bypass')$q$,'42501');
select public.transition_job(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'published');
select pg_temp.assert_ok((select status='published' and published_at is not null and content_version=2 from public.jobs where id=current_setting('test.job')::uuid),'publish meaningful content');
select pg_temp.expect_error($q$select public.transition_job(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'archived')$q$,'22023');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Engineer',current_setting('test.doc')::jsonb,null,2,true)$q$,'22023');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Engineer','{"type":"doc","content":[{"type":"paragraph"}]}',null,2,false)$q$,'22023');
-- Editing substantive content preserves the Phase 1 advisory assessment boundary.
insert into public.candidate_cvs(candidate_id,organisation_id,object_id,byte_size) values(current_setting('test.candidate')::uuid,current_setting('test.a')::uuid,current_setting('test.version')::uuid,100);
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,2,current_setting('test.result')::jsonb);
select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Senior Engineer',current_setting('test.doc')::jsonb,null,2,false);
select pg_temp.assert_ok((select content_version=3 and closes_at is null from public.jobs where id=current_setting('test.job')::uuid),'edit published Job');
select pg_temp.assert_ok((select assessment_status='stale' and stage='applied' from public.applications where id=current_setting('test.app')::uuid),'edit stales assessment without stage change');
select pg_temp.assert_ok(not exists(select 1 from public.candidate_assessments where application_id=current_setting('test.app')::uuid),'stale assessment hidden');
select pg_temp.actor(current_setting('test.cb'));
select pg_temp.expect_error($q$select public.transition_job(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'closed')$q$,'42501');
select pg_temp.expect_error($q$select public.transition_job(current_setting('test.b')::uuid,current_setting('test.job')::uuid,'closed')$q$,'42501');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.b')::uuid,current_setting('test.job')::uuid,'Foreign',current_setting('test.doc')::jsonb,null,3,false)$q$,'42501');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,null,'Foreign',current_setting('test.doc')::jsonb,null,null,true)$q$,'42501');
select pg_temp.actor(current_setting('test.admin'));
select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Senior Engineer',current_setting('test.doc')::jsonb,null,3,false);
select public.transition_job(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'closed');
select pg_temp.assert_ok((select status='closed' and closed_at is not null and content_version=3 from public.jobs where id=current_setting('test.job')::uuid),'assigned Admin closes early without version bump');
reset role;
delete from public.admin_organisation_assignments where admin_id=:'admin_id';
set local role authenticated;
select pg_temp.expect_error($q$select public.transition_job(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'archived')$q$,'42501');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,null,'Revoked',current_setting('test.doc')::jsonb,null,null,true)$q$,'42501');
select pg_temp.actor(current_setting('test.ca'));
select pg_temp.expect_error($q$select public.transition_job(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'published')$q$,'22023');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'Closed',current_setting('test.doc')::jsonb,null,3,false)$q$,'22023');
select public.transition_job(current_setting('test.a')::uuid,current_setting('test.job')::uuid,'archived');
select public.transition_job(current_setting('test.a')::uuid,current_setting('test.draft')::uuid,'archived');
select pg_temp.expect_error($q$select public.transition_job(current_setting('test.a')::uuid,current_setting('test.draft')::uuid,'published')$q$,'22023');
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,current_setting('test.draft')::uuid,'Archived',current_setting('test.doc')::jsonb,null,1,true)$q$,'22023');
select pg_temp.actor(current_setting('test.owner'));
select public.save_job_content(current_setting('test.b')::uuid,null,'Owner Job',current_setting('test.doc')::jsonb,null,null,true) as owner_job \gset
select public.transition_job(current_setting('test.b')::uuid,:'owner_job','published');
select pg_temp.actor(null);
select pg_temp.expect_error($q$select public.save_job_content(current_setting('test.a')::uuid,null,'Anonymous',current_setting('test.doc')::jsonb,null,null,true)$q$,'42501');
reset role;
-- Published legacy plain-text Jobs remain supported, but expired deadlines block publish.
update public.jobs set status='draft',closes_at=now()-interval '1 day' where id=:'owner_job';
select pg_temp.actor(current_setting('test.owner'));
set local role authenticated;
select pg_temp.expect_error(format('select public.transition_job(%L::uuid,%L::uuid,%L)',current_setting('test.b'),:'owner_job','published'),'22023');
reset role;
do $$ declare r text; f text; begin
 foreach r in array array['anon','authenticated','service_role'] loop
  if has_any_column_privilege(r,'public.jobs','INSERT,UPDATE') then raise exception 'Unexpected direct Job write grant'; end if;
  foreach f in array array['public.save_job_content(uuid,uuid,text,jsonb,timestamptz,integer,boolean)','public.transition_job(uuid,uuid,public.job_status)'] loop
   if has_function_privilege(r,f,'EXECUTE') is distinct from (r='authenticated') then raise exception 'Unexpected RPC grant'; end if;
  end loop;
 end loop;
end $$;
rollback;
\echo PASS: authenticated Job management acceptance rolled back
