-- Run after migration approval using psql as postgres. Managed verification passed 2026-09-26.
-- Five distinct disposable, confirmed Auth users WITHOUT profiles, created by
-- trusted Auth administration: owner_id, admin_id, customer_a_id, customer_b_id,
-- unused_id. Never use real demo accounts. No auth.users writes in this suite.
\set ON_ERROR_STOP on
create temporary table recruitment_before as select
 (select count(*) from public.jobs) jobs,
 (select count(*) from public.candidates) candidates,
 (select count(*) from public.applications) applications,
 (select count(*) from public.profiles) profiles,
 (select count(*) from public.organisations) organisations,
 (select count(*) from public.admin_organisation_assignments) assignments;
begin;
select set_config('test.owner', :'owner_id', true), set_config('test.admin', :'admin_id', true),
 set_config('test.ca', :'customer_a_id', true), set_config('test.cb', :'customer_b_id', true),
 set_config('test.unused', :'unused_id', true),
 set_config('test.a',gen_random_uuid()::text,true),set_config('test.b',gen_random_uuid()::text,true);
do $$ declare ids uuid[] := array[current_setting('test.owner')::uuid,current_setting('test.admin')::uuid,current_setting('test.ca')::uuid,current_setting('test.cb')::uuid,current_setting('test.unused')::uuid]; begin
 if (select count(distinct id) from unnest(ids) id) <> 5
 or (select count(*) from auth.users where id=any(ids) and email_confirmed_at is not null) <> 5
 or exists(select 1 from public.profiles where id=any(ids)) then
 raise exception 'Require five distinct confirmed disposable Auth users with no profiles'; end if;
end $$;
insert into public.organisations(id,name) values(current_setting('test.a')::uuid,'Recruitment fixture A'),(current_setting('test.b')::uuid,'Recruitment fixture B');
insert into public.profiles(id,full_name,role,organisation_id) values
 (:'owner_id','Fixture owner','platform_owner',null),(:'admin_id','Fixture admin','admin',null),
 (:'customer_a_id','Fixture customer A','customer',current_setting('test.a')::uuid),
 (:'customer_b_id','Fixture customer B','customer',current_setting('test.b')::uuid);
insert into public.admin_organisation_assignments(admin_id,organisation_id) values(:'admin_id',current_setting('test.a')::uuid);

create function pg_temp.actor(subject text) returns void language plpgsql as $$ begin
 perform set_config('request.jwt.claim.sub',coalesce(subject,''),true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated')::text,true);
end $$;
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
end $$;
create function pg_temp.expect_error(statement text,expected text) returns void language plpgsql as $$ begin
 begin execute statement; exception when others then
  if sqlstate=expected then return; end if;
  raise exception 'Unexpected SQLSTATE %, expected %',sqlstate,expected;
 end;
 raise exception 'Expected SQLSTATE % but statement succeeded',expected;
end $$;
-- All test helpers are invoker functions: they do not bypass RLS or ACLs.
select pg_temp.actor(current_setting('test.ca'));
set local role authenticated;
insert into public.jobs(organisation_id,title,description) values(current_setting('test.a')::uuid,'Engineer','P0 description') returning id as job_a \gset
insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'Designer') returning id as job_a2 \gset
insert into public.candidates(organisation_id,full_name,email,phone,linkedin_url) values(current_setting('test.a')::uuid,'Jane Doe','jane@example.invalid','+123456','https://www.linkedin.com/in/jane-doe/') returning id as candidate_a \gset
insert into public.candidates(organisation_id,full_name) values(current_setting('test.a')::uuid,'Alex') returning id as candidate_a2 \gset
select set_config('test.ja', :'job_a',true),set_config('test.ja2', :'job_a2',true),set_config('test.canda', :'candidate_a',true),set_config('test.canda2', :'candidate_a2',true);
insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.a')::uuid,:'candidate_a',:'job_a') returning id as application_a \gset
select set_config('test.appa', :'application_a',true);
select pg_temp.assert_ok((select stage='applied' from public.applications where id=:'application_a'),'initial applied stage');
insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.a')::uuid,:'candidate_a',:'job_a2');
insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.a')::uuid,:'candidate_a2',:'job_a');
select pg_temp.expect_error($q$insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.a')::uuid,current_setting('test.canda')::uuid,current_setting('test.ja')::uuid)$q$,'23505');
update public.applications set stage='interview' where id=:'application_a';
select pg_temp.assert_ok((select stage='interview' from public.applications where id=:'application_a'),'stage read-back persists');
select pg_temp.assert_ok((select stage='applied' from public.applications where candidate_id=:'candidate_a' and job_id=:'job_a2'),'other Job stage independent');
select pg_temp.assert_ok((select count(*)=2 from public.applications where job_id=:'job_a'),'Job filter');
select pg_temp.assert_ok((select count(*)=2 from public.applications a join public.candidates c on c.id=a.candidate_id and c.organisation_id=a.organisation_id where a.organisation_id=current_setting('test.a')::uuid and c.full_name ilike '%jAnE%'),'case-insensitive name filter');
select pg_temp.assert_ok((select count(*)=1 from public.applications a join public.candidates c on c.id=a.candidate_id and c.organisation_id=a.organisation_id where a.job_id=:'job_a' and c.full_name ilike '%jAnE%'),'combined filters');
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,' ')$q$,'23514');
select pg_temp.expect_error($q$insert into public.candidates(organisation_id,full_name,linkedin_url) values(current_setting('test.a')::uuid,'Bad URL','https://linkedin.com.evil.test/in/name')$q$,'23514');
select pg_temp.expect_error($q$update public.applications set stage='archived' where id=current_setting('test.appa')::uuid$q$,'22P02');
select pg_temp.expect_error($q$update public.applications set organisation_id=current_setting('test.b')::uuid where id=current_setting('test.appa')::uuid$q$,'42501');
select pg_temp.expect_error($q$update public.applications set candidate_id=current_setting('test.canda2')::uuid where id=current_setting('test.appa')::uuid$q$,'42501');
select pg_temp.expect_error($q$delete from public.applications where id=current_setting('test.appa')::uuid$q$,'42501');

-- Customer B owns B; cannot see or write A. JWT metadata does not grant Owner.
select pg_temp.actor(current_setting('test.cb'));
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.cb'),'role','authenticated','user_metadata',jsonb_build_object('role','platform_owner'))::text,true);
insert into public.jobs(organisation_id,title) values(current_setting('test.b')::uuid,'Other Job') returning id as job_b \gset
insert into public.candidates(organisation_id,full_name) values(current_setting('test.b')::uuid,'Other Candidate') returning id as candidate_b \gset
select set_config('test.jb', :'job_b',true),set_config('test.candb', :'candidate_b',true);
select pg_temp.assert_ok(not exists(select 1 from public.jobs where organisation_id=current_setting('test.a')::uuid),'B cannot read A Jobs');
select pg_temp.assert_ok(not exists(select 1 from public.candidates where organisation_id=current_setting('test.a')::uuid),'B cannot read A Candidates');
select pg_temp.assert_ok(not exists(select 1 from public.applications where organisation_id=current_setting('test.a')::uuid),'B cannot read A Applications');
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'Forbidden')$q$,'42501');
select pg_temp.expect_error($q$insert into public.candidates(organisation_id,full_name) values(current_setting('test.a')::uuid,'Forbidden')$q$,'42501');
select pg_temp.expect_error($q$insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.a')::uuid,current_setting('test.canda2')::uuid,current_setting('test.ja2')::uuid)$q$,'42501');
with changed as (update public.applications set stage='hired' where id=current_setting('test.appa')::uuid returning id) select pg_temp.assert_ok((select count(*)=0 from changed),'B cannot update A stage');

select pg_temp.actor(current_setting('test.ca'));
select pg_temp.assert_ok(not exists(select 1 from public.jobs where id=:'job_b'),'A cannot read B Job');
select pg_temp.assert_ok(not exists(select 1 from public.candidates where id=:'candidate_b'),'A cannot read B Candidate');
select pg_temp.expect_error($q$insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.a')::uuid,current_setting('test.candb')::uuid,current_setting('test.ja')::uuid)$q$,'23503');
select pg_temp.expect_error($q$insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.a')::uuid,current_setting('test.canda')::uuid,current_setting('test.jb')::uuid)$q$,'23503');
select pg_temp.assert_ok((select stage='interview' from public.applications where id=:'application_a'),'denied updates preserve stage');

-- Assigned Admin reads and mutates only A; revoked assignment applies next statement.
select pg_temp.actor(current_setting('test.admin'));
select pg_temp.assert_ok(exists(select 1 from public.jobs where id=:'job_a') and not exists(select 1 from public.jobs where id=:'job_b'),'Admin assigned visibility');
insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'Admin Job');
insert into public.candidates(organisation_id,full_name) values(current_setting('test.a')::uuid,'Admin Candidate');
update public.applications set stage='offer' where id=:'application_a';
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.b')::uuid,'Forbidden')$q$,'42501');
reset role;
delete from public.admin_organisation_assignments where admin_id=:'admin_id';
set local role authenticated;
select pg_temp.assert_ok(not exists(select 1 from public.jobs where organisation_id in(current_setting('test.a')::uuid,current_setting('test.b')::uuid)),'revoked Admin reads denied immediately');
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'Revoked')$q$,'42501');
with changed as (update public.applications set stage='hired' where id=current_setting('test.appa')::uuid returning id) select pg_temp.assert_ok((select count(*)=0 from changed),'revoked Admin update denied');

-- Owner can act in both contexts, but cannot defeat composite relationships.
select pg_temp.actor(current_setting('test.owner'));
select pg_temp.assert_ok((select count(*)=2 from public.jobs where id in(:'job_a',:'job_b')),'Owner all contexts');
insert into public.jobs(organisation_id,title) values(current_setting('test.b')::uuid,'Owner Job');
insert into public.candidates(organisation_id,full_name) values(current_setting('test.b')::uuid,'Owner Candidate');
insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.b')::uuid,:'candidate_b',:'job_b');
select pg_temp.expect_error($q$insert into public.applications(organisation_id,candidate_id,job_id) values(current_setting('test.a')::uuid,current_setting('test.canda')::uuid,current_setting('test.jb')::uuid)$q$,'23503');
update public.applications set stage='hired' where id=:'application_a';
select pg_temp.assert_ok((select stage='hired' from public.applications where id=:'application_a'),'Owner stage persistence');
select pg_temp.actor(current_setting('test.unused'));
select pg_temp.assert_ok(not exists(select 1 from public.jobs),'missing profile reads denied');
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'No profile')$q$,'42501');
select pg_temp.actor(null);
select pg_temp.assert_ok(nullif(current_setting('request.jwt.claim.sub'),'') is null,'subject cleared');
select pg_temp.assert_ok(not exists(select 1 from public.jobs),'missing JWT subject denied');
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'No JWT')$q$,'42501');
reset role;

-- Anonymous and secret-key database roles cannot directly read or mutate recruitment.
set local role anon;
select pg_temp.expect_error('select * from public.jobs','42501');
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'Anonymous')$q$,'42501');
reset role;
set local role service_role;
select pg_temp.expect_error('select * from public.candidates','42501');
select pg_temp.expect_error($q$insert into public.jobs(organisation_id,title) values(current_setting('test.a')::uuid,'Secret role')$q$,'42501');
select pg_temp.expect_error($q$update public.applications set stage='hired'$q$,'42501');
reset role;

-- ACL assertions include column ACLs; table-level checks alone miss these grants.
do $$ declare t text; r text; col record; begin
 foreach t in array array['jobs','candidates','applications'] loop
  if (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) is distinct from true then raise exception 'RLS missing'; end if;
  if not has_table_privilege('authenticated','public.'||t,'SELECT') then raise exception 'SELECT missing'; end if;
  foreach r in array array['anon','service_role'] loop
   if has_table_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or has_any_column_privilege(r,'public.'||t,'SELECT,INSERT,UPDATE,REFERENCES') then raise exception 'Unexpected ACL % %',r,t; end if;
  end loop;
  if has_table_privilege('authenticated','public.'||t,'DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Unexpected destructive ACL'; end if;
  for col in select column_name from information_schema.columns where table_schema='public' and table_name=t loop
   if has_column_privilege('authenticated','public.'||t,col.column_name,'UPDATE') is distinct from ((t='applications' and col.column_name in ('stage','removed_at')) or (t='jobs' and col.column_name in ('title','description','status','closes_at'))) then raise exception 'Unexpected UPDATE ACL'; end if;
  end loop;
 end loop;
end $$;
rollback;
do $$ begin
 if exists(select 1 from recruitment_before b where b.jobs<>(select count(*) from public.jobs) or b.candidates<>(select count(*) from public.candidates) or b.applications<>(select count(*) from public.applications) or b.profiles<>(select count(*) from public.profiles) or b.organisations<>(select count(*) from public.organisations) or b.assignments<>(select count(*) from public.admin_organisation_assignments)) then raise exception 'Fixture rollback failed'; end if;
end $$;
drop table recruitment_before;
\echo PASS: recruitment acceptance cases and fixture rollback
