-- Local transactional public projection/ACL acceptance. No Auth fixtures required.
begin;
create function pg_temp.assert_ok(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%',message; end if; end $$;
insert into public.organisations(id,name,careers_slug) values
 ('72000000-0000-4000-8000-000000000001','Public A','discovery-test-a'),
 ('72000000-0000-4000-8000-000000000002','Public B','discovery-test-b');
insert into public.jobs(organisation_id,title,description,status,closes_at)
 select '72000000-0000-4000-8000-000000000001',state,'Meaningful description',state::public.job_status,null
 from unnest(array['draft','published','closed','archived']) state;
insert into public.jobs(organisation_id,title,description,status,closes_at)
 values('72000000-0000-4000-8000-000000000001','Expired','Meaningful description','published',now()-interval '1 second'),
 ('72000000-0000-4000-8000-000000000001','Future','Meaningful description','published',now()+interval '1 hour');
select set_config('test.open_id',(select public_id::text from public.jobs where organisation_id='72000000-0000-4000-8000-000000000001' and title='published'),true);
select set_config('test.hidden_ids',(select jsonb_agg(public_id)::text from public.jobs where organisation_id='72000000-0000-4000-8000-000000000001' and title in ('draft','closed','archived','Expired')),true);
set local role anon;
select pg_temp.assert_ok(jsonb_array_length(public.read_public_careers('discovery-test-a')->'jobs')=2,'Only open published Jobs');
select pg_temp.assert_ok(public.read_public_job('discovery-test-a',current_setting('test.open_id')::uuid) is not null,'Published Job visible');
select pg_temp.assert_ok(public.read_public_job('discovery-test-b',current_setting('test.open_id')::uuid) is null,'Cannot mix tenants');
select pg_temp.assert_ok(public.read_public_careers('missing-slug') is null,'Missing organisation');
select pg_temp.assert_ok((select array_agg(key order by key) from jsonb_object_keys(public.read_public_careers('discovery-test-a')->'jobs'->0) key)=array['closes_at','public_id','published_at','teaser','title'],'Exact five-field careers card projection');
select pg_temp.assert_ok(public.read_public_job('discovery-test-a',value::uuid) is null,'Hidden Job unavailable')
 from jsonb_array_elements_text(current_setting('test.hidden_ids')::jsonb);
select pg_temp.assert_ok((select array_agg(key order by key) from jsonb_object_keys(public.read_public_job('discovery-test-a',current_setting('test.open_id')::uuid)->'job') key)=array['closes_at','description','description_rich','public_id','published_at','teaser','title'],'Exact public Job fields');
select pg_temp.assert_ok((select array_agg(key order by key) from jsonb_object_keys(public.read_public_careers('discovery-test-a')->'organisation') key)=array['careers_slug','name'],'Exact public organisation fields');
reset role;
select pg_temp.assert_ok(not has_table_privilege('anon','public.jobs','select'),'No anonymous Job table reads');
select pg_temp.assert_ok(not has_table_privilege('anon','public.candidates','select,insert,update,delete'),'No anonymous Candidate access');
select pg_temp.assert_ok(not has_table_privilege('anon','public.applications','select,insert,update,delete'),'No anonymous Application access');
select pg_temp.assert_ok((select not public from storage.buckets where id='candidate-cvs'),'Private CV bucket');
rollback;
