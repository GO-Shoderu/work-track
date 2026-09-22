-- REVIEW ONLY: do not execute before separate managed-project approval.
-- psql, postgres, ON_ERROR_STOP. Eight distinct disposable Auth users with NO
-- profiles must already exist, created through trusted Auth administration:
-- owner_id, admin_id, customer_a_id, customer_b_id, extra_customer_id,
-- delegated_customer_id, new_admin_id, unused_id. No auth.users mutations here.
-- All application fixtures and successful RPC writes are rolled back.
\set ON_ERROR_STOP on
begin;
select set_config('test.owner', :'owner_id', true),
       set_config('test.admin', :'admin_id', true),
       set_config('test.customer_a', :'customer_a_id', true),
       set_config('test.customer_b', :'customer_b_id', true),
       set_config('test.extra', :'extra_customer_id', true),
       set_config('test.delegated', :'delegated_customer_id', true),
       set_config('test.new_admin', :'new_admin_id', true),
       set_config('test.unused', :'unused_id', true);

do $$
declare ids uuid[] := array[
  current_setting('test.owner')::uuid, current_setting('test.admin')::uuid,
  current_setting('test.customer_a')::uuid, current_setting('test.customer_b')::uuid,
  current_setting('test.extra')::uuid, current_setting('test.delegated')::uuid,
  current_setting('test.new_admin')::uuid, current_setting('test.unused')::uuid];
begin
  if (select count(distinct id) from unnest(ids) id) <> 8
     or (select count(*) from auth.users where id = any(ids)) <> 8
     or exists (select 1 from public.profiles where id = any(ids)) then
    raise exception 'Eight distinct existing disposable Auth users without profiles required';
  end if;
end;
$$;

-- Random fixture IDs avoid collisions with real Organisations. No real rows
-- are modified. Snapshots establish that rollback restores the prior state.
create temporary table before_counts as select
  (select count(*) from public.organisations) as organisations,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.admin_organisation_assignments) as assignments;
select set_config('test.org_b', gen_random_uuid()::text, true),
       set_config('test.unknown', gen_random_uuid()::text, true);
do $$ begin
  if exists (select 1 from auth.users where id = current_setting('test.unknown')::uuid) then
    raise exception 'Unknown UUID unexpectedly exists';
  end if;
end $$;
insert into public.organisations(id,name) values(current_setting('test.org_b')::uuid,'Provisioning fixture B');
insert into public.profiles(id,full_name,role,organisation_id) values
  (:'owner_id','Provisioning Owner','platform_owner',null),
  (:'admin_id','Provisioning Admin','admin',null),
  (:'customer_b_id','Provisioning Customer B','customer',current_setting('test.org_b')::uuid);

-- Foundation ACLs remain intentionally restrictive, even for secret-key role.
do $$
declare t text; r text; op text; f text; definition record;
begin
  foreach t in array array['organisations','profiles','admin_organisation_assignments'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then raise exception 'RLS disabled'; end if;
    if not has_table_privilege('authenticated','public.' || t,'SELECT') then raise exception 'SELECT missing'; end if;
    foreach r in array array['anon','authenticated','service_role'] loop
      foreach op in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(r,'public.' || t,op) then raise exception 'Unexpected table privilege: % % %',r,t,op; end if;
      end loop;
      if r <> 'authenticated' and has_table_privilege(r,'public.' || t,'SELECT') then raise exception 'Unexpected SELECT'; end if;
    end loop;
  end loop;
  foreach f in array array[
    'public.provision_customer_organisation(uuid,text,text)',
    'public.provision_customer_for_organisation(uuid,uuid,text)',
    'public.provision_admin(uuid,text)',
    'public.assign_admin_to_organisation(uuid,uuid)',
    'public.unassign_admin_from_organisation(uuid,uuid)'
  ] loop
    if not has_function_privilege('authenticated',f,'EXECUTE') then raise exception 'RPC grant missing'; end if;
    foreach r in array array['anon','service_role'] loop
      if has_function_privilege(r,f,'EXECUTE') then raise exception 'RPC exposed to %',r; end if;
    end loop;
    select p.prosecdef,p.proconfig,pg_get_userbyid(p.proowner) as owner into definition from pg_proc p where p.oid=f::regprocedure;
    if definition.prosecdef is distinct from true
       or definition.owner is distinct from 'postgres'
       or not coalesce(
         'search_path=""' = any(definition.proconfig),
         false
       )
    then
      raise exception 'Unsafe function configuration: %', f;
    end if;
  end loop;
end;
$$;

select set_config('request.jwt.claim.sub', :'owner_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'owner_id','role','authenticated')::text, true);
set local role authenticated;
select set_config('test.org_a',public.provision_customer_organisation(:'customer_a_id','Provisioning fixture A','Customer A')::text,true);
select public.provision_customer_for_organisation(:'extra_customer_id',current_setting('test.org_a')::uuid,'Extra Customer');
select public.provision_admin(:'new_admin_id','New Admin');
select public.assign_admin_to_organisation(:'admin_id',current_setting('test.org_a')::uuid);
-- Repeat assignment is intentionally idempotent.
select public.assign_admin_to_organisation(:'admin_id',current_setting('test.org_a')::uuid);
do $$
declare original_count bigint;
begin
  if not exists (select 1 from public.profiles where id=current_setting('test.customer_a')::uuid and role='customer' and organisation_id=current_setting('test.org_a')::uuid)
    or not exists (select 1 from public.profiles where id=current_setting('test.extra')::uuid and role='customer' and organisation_id=current_setting('test.org_a')::uuid)
    or not exists (select 1 from public.profiles where id=current_setting('test.new_admin')::uuid and role='admin' and organisation_id is null) then raise exception 'Provisioned relationship incorrect'; end if;
  select count(*) into original_count from public.organisations;
  begin
    perform public.provision_customer_organisation(current_setting('test.customer_a')::uuid,'Duplicate fixture','Duplicate');
    raise exception 'Duplicate profile accepted';
  exception when unique_violation then null; end;
  begin
    perform public.provision_customer_organisation(current_setting('test.unknown')::uuid,'Unknown fixture','Unknown');
    raise exception 'Unknown Auth UUID accepted';
  exception when foreign_key_violation then null; end;
  begin
    perform public.provision_customer_organisation(current_setting('test.unused')::uuid,'   ','Invalid name');
    raise exception 'Blank Organisation name accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.organisations) <> original_count then raise exception 'Failed operation left an Organisation'; end if;
  begin
    perform public.assign_admin_to_organisation(current_setting('test.customer_a')::uuid,current_setting('test.org_a')::uuid);
    raise exception 'Customer assigned as Admin';
  exception when foreign_key_violation then null; end;
  begin
    perform public.provision_customer_for_organisation(current_setting('test.unused')::uuid,current_setting('test.unknown')::uuid,'Unknown Organisation');
    raise exception 'Unknown Organisation accepted';
  exception when foreign_key_violation then null; end;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', :'admin_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'admin_id','role','authenticated')::text, true);
set local role authenticated;
select public.provision_customer_for_organisation(:'delegated_customer_id',current_setting('test.org_a')::uuid,'Delegated Customer');
do $$ begin
  if not exists (select 1 from public.profiles where id=current_setting('test.delegated')::uuid and organisation_id=current_setting('test.org_a')::uuid) then raise exception 'Assigned Admin provisioning failed'; end if;
  if exists (select 1 from public.profiles where id=current_setting('test.customer_b')::uuid) then raise exception 'Cross-tenant profile read'; end if;
  begin perform public.provision_customer_for_organisation(current_setting('test.unused')::uuid,current_setting('test.org_b')::uuid,'Cross tenant'); raise exception 'Cross-tenant provisioning succeeded'; exception when insufficient_privilege then null; end;
  begin perform public.provision_admin(current_setting('test.unused')::uuid,'Escalation'); raise exception 'Admin created Admin'; exception when insufficient_privilege then null; end;
  begin perform public.provision_customer_organisation(current_setting('test.unused')::uuid,'Escalation','Escalation'); raise exception 'Admin created Organisation'; exception when insufficient_privilege then null; end;
  begin perform public.assign_admin_to_organisation(auth.uid(),current_setting('test.org_b')::uuid); raise exception 'Admin self-assigned'; exception when insufficient_privilege then null; end;
  begin perform public.unassign_admin_from_organisation(auth.uid(),current_setting('test.org_a')::uuid); raise exception 'Admin unassigned'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'customer_a_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'customer_a_id','role','authenticated','user_metadata',json_build_object('role','platform_owner'))::text, true);
set local role authenticated;
do $$ begin
  begin perform public.provision_customer_for_organisation(current_setting('test.unused')::uuid,current_setting('test.org_a')::uuid,'Forbidden'); raise exception 'Customer created Customer'; exception when insufficient_privilege then null; end;
  begin perform public.provision_customer_for_organisation(current_setting('test.unused')::uuid,current_setting('test.org_b')::uuid,'Forbidden'); raise exception 'Customer cross-tenant creation'; exception when insufficient_privilege then null; end;
  begin perform public.provision_customer_organisation(current_setting('test.unused')::uuid,'Forbidden','Forbidden'); raise exception 'Customer created Organisation'; exception when insufficient_privilege then null; end;
  begin perform public.provision_admin(current_setting('test.unused')::uuid,'Forbidden'); raise exception 'Customer created Admin'; exception when insufficient_privilege then null; end;
  begin perform public.assign_admin_to_organisation(current_setting('test.admin')::uuid,current_setting('test.org_b')::uuid); raise exception 'Customer assigned Admin'; exception when insufficient_privilege then null; end;
  begin perform public.unassign_admin_from_organisation(current_setting('test.admin')::uuid,current_setting('test.org_a')::uuid); raise exception 'Customer unassigned Admin'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.organisations) <> 1 or (select count(*) from public.profiles) <> 1 then raise exception 'Customer isolation failed'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub', :'owner_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'owner_id','role','authenticated')::text, true);
set local role authenticated;
select public.unassign_admin_from_organisation(:'admin_id',current_setting('test.org_a')::uuid);
reset role;
select set_config('request.jwt.claim.sub', :'admin_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'admin_id','role','authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.organisations) then raise exception 'Unassigned Admin retains Organisation visibility'; end if;
  begin perform public.provision_customer_for_organisation(current_setting('test.unused')::uuid,current_setting('test.org_a')::uuid,'Revoked'); raise exception 'Unassigned Admin retains provisioning'; exception when insufficient_privilege then null; end;
  begin insert into public.organisations(name) values('Direct'); raise exception 'Direct INSERT allowed'; exception when insufficient_privilege then null; end;
  begin update public.profiles set role='platform_owner' where id=auth.uid(); raise exception 'Direct UPDATE allowed'; exception when insufficient_privilege then null; end;
  begin delete from public.admin_organisation_assignments where admin_id=auth.uid(); raise exception 'Direct DELETE allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Valid Auth identity without profile, then no JWT subject at all.
select set_config('request.jwt.claim.sub', :'unused_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'unused_id','role','authenticated')::text, true);
set local role authenticated;
do $$ begin
  begin perform public.provision_admin(current_setting('test.unused')::uuid,'No profile'); raise exception 'Unprofiled identity provisioned'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin perform public.provision_admin(current_setting('test.unused')::uuid,'No subject'); raise exception 'Missing subject provisioned'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- psql variables survive ROLLBACK; SQL fixtures and local settings do not.
select organisations as before_organisations,profiles as before_profiles,assignments as before_assignments from before_counts \gset
rollback;
select (select count(*) from public.organisations) = :before_organisations
   and (select count(*) from public.profiles) = :before_profiles
   and (select count(*) from public.admin_organisation_assignments) = :before_assignments
   and not exists(select 1 from public.profiles where id in (:'owner_id',:'admin_id',:'customer_a_id',:'customer_b_id',:'extra_customer_id',:'delegated_customer_id',:'new_admin_id',:'unused_id')) as fixtures_rolled_back \gset
\if :fixtures_rolled_back
  \echo 'PASS: provisioning acceptance cases and fixture rollback'
\else
  \echo 'FAIL: fixture cleanup verification'
  \quit 1
\endif
