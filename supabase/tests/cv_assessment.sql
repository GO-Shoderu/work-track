-- REVIEW ONLY; NOT RUN. After migration approval, psql as postgres.
-- Four disposable confirmed Auth identities WITHOUT profiles, created through Auth
-- administration: owner_id, admin_id, customer_a_id, customer_b_id.
-- No real CV bytes or storage.objects rows are created. Storage HTTP round-trip,
-- MIME/size enforcement and public URL denial require a separate approved test.
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
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
insert into public.candidate_cvs(candidate_id,organisation_id,object_id,byte_size) values(current_setting('test.candidate')::uuid,current_setting('test.a')::uuid,current_setting('test.version')::uuid,100);
select pg_temp.assert_ok(private.can_access_candidate_cv(current_setting('test.a')||'/'||current_setting('test.candidate')||'/'||current_setting('test.version')||'.pdf'),'own CV path');
select pg_temp.assert_ok(not private.can_access_candidate_cv(current_setting('test.b')||'/'||current_setting('test.candidate')||'/'||current_setting('test.version')||'.pdf'),'forged Organisation path');
select pg_temp.assert_ok(not private.can_access_candidate_cv('../'||current_setting('test.candidate')||'/x.pdf'),'traversal denied');
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.result')::jsonb);
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.result')::jsonb);
select pg_temp.assert_ok((select count(*)=1 from public.candidate_assessments where application_id=current_setting('test.app')::uuid),'one latest result');
select pg_temp.expect_error($q$update public.candidate_assessments set result='{}'$q$,'42501');
select pg_temp.expect_error($q$insert into public.candidate_assessments(application_id,organisation_id,cv_object_id,result) values(current_setting('test.app')::uuid,current_setting('test.a')::uuid,current_setting('test.version')::uuid,'{}')$q$,'42501');
select pg_temp.expect_error($q$update public.candidate_cvs set organisation_id=current_setting('test.b')::uuid$q$,'42501');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,'{}')$q$,'22023');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,jsonb_set(current_setting('test.result')::jsonb,'{score}','101'))$q$,'22023');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,gen_random_uuid(),current_setting('test.result')::jsonb)$q$,'22023');
select pg_temp.actor(current_setting('test.cb'));
select pg_temp.assert_ok(not exists(select 1 from public.candidate_cvs),'cross-tenant CV metadata hidden');
select pg_temp.assert_ok(not exists(select 1 from public.candidate_assessments),'cross-tenant results hidden');
select pg_temp.assert_ok(not private.can_access_candidate_cv(current_setting('test.a')||'/'||current_setting('test.candidate')||'/'||current_setting('test.version')||'.pdf'),'cross-tenant Storage denied');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.result')::jsonb)$q$,'42501');
select pg_temp.actor(current_setting('test.admin'));
select pg_temp.assert_ok(exists(select 1 from public.candidate_cvs),'assigned Admin reads CV');
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.result')::jsonb);
reset role;
delete from public.admin_organisation_assignments where admin_id=:'admin_id';
set local role authenticated;
select pg_temp.assert_ok(not exists(select 1 from public.candidate_assessments),'revocation removes result access');
select pg_temp.assert_ok(not private.can_access_candidate_cv(current_setting('test.a')||'/'||current_setting('test.candidate')||'/'||current_setting('test.version')||'.pdf'),'revocation removes Storage access');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.result')::jsonb)$q$,'42501');
select pg_temp.actor(current_setting('test.owner'));
select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.result')::jsonb);
update public.candidate_cvs set object_id=gen_random_uuid() where candidate_id=current_setting('test.candidate')::uuid;
select pg_temp.assert_ok(not exists(select 1 from public.candidate_assessments),'replacement hides stale assessment');
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.result')::jsonb)$q$,'22023');
select pg_temp.actor(null);
select pg_temp.expect_error($q$select public.save_candidate_assessment(current_setting('test.app')::uuid,current_setting('test.version')::uuid,current_setting('test.result')::jsonb)$q$,'42501');
reset role;
do $$ declare definition record;r text;begin
 if not exists(select 1 from storage.buckets where id='candidate-cvs' and public=false and file_size_limit=5242880 and allowed_mime_types=array['application/pdf']) then raise exception 'Unsafe bucket';end if;
 select p.prosecdef,p.proconfig,pg_get_userbyid(p.proowner) owner into definition from pg_proc p where oid='public.save_candidate_assessment(uuid,uuid,jsonb)'::regprocedure;
 if definition.prosecdef is distinct from true or definition.owner is distinct from 'postgres' or not coalesce('search_path=""'=any(definition.proconfig),false) then raise exception 'Unsafe RPC';end if;
 foreach r in array array['anon','authenticated','service_role'] loop
  if has_table_privilege(r,'public.candidate_assessments','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or has_any_column_privilege(r,'public.candidate_assessments','INSERT,UPDATE,REFERENCES') then raise exception 'Unsafe assessment ACL';end if;
  if has_function_privilege(r,'public.save_candidate_assessment(uuid,uuid,jsonb)','EXECUTE') is distinct from (r='authenticated') then raise exception 'Unsafe function ACL';end if;
 end loop;
end $$;
rollback;
\echo PASS: CV metadata and assessment SQL acceptance rolled back
