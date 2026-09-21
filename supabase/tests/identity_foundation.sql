-- REVIEW ONLY. No connection or execution is authorised yet.
-- After approval, run via psql as postgres against the designated demo project.
-- Requires SEVEN separately approved disposable Auth UUIDs, with NO profiles:
-- owner_id, admin_a_id, admin_b_id, unassigned_id, customer_a_id,
-- customer_b_id, missing_profile_id (psql -v name=uuid ... -f this_file).
-- Creates only temporary fixture application rows; rolls everything back.
-- Does NOT create Auth users, install extensions or disable RLS.
\set ON_ERROR_STOP on
begin;
select set_config('test.owner', :'owner_id', true),
       set_config('test.admin_a', :'admin_a_id', true),
       set_config('test.admin_b', :'admin_b_id', true),
       set_config('test.unassigned', :'unassigned_id', true),
       set_config('test.customer_a', :'customer_a_id', true),
       set_config('test.customer_b', :'customer_b_id', true),
       set_config('test.missing', :'missing_profile_id', true);

do $$
declare fixture_ids uuid[] := array[
  current_setting('test.owner')::uuid, current_setting('test.admin_a')::uuid,
  current_setting('test.admin_b')::uuid, current_setting('test.unassigned')::uuid,
  current_setting('test.customer_a')::uuid, current_setting('test.customer_b')::uuid,
  current_setting('test.missing')::uuid];
begin
  if (select count(distinct id) from unnest(fixture_ids) as id) <> 7 then
    raise exception 'Seven distinct disposable identities are required';
  end if;
  if (select count(*) from auth.users where id = any(fixture_ids)) <> 7 then
    raise exception 'Fixture Auth identities must already exist';
  end if;
  if exists (select 1 from public.profiles where id = any(fixture_ids)) then
    raise exception 'Fixture identities must not have existing profiles';
  end if;
end;
$$;
insert into public.organisations (id, name) values
  ('11111111-1111-4111-8111-111111111111', 'RLS fixture A'),
  ('22222222-2222-4222-8222-222222222222', 'RLS fixture B');
insert into public.profiles (id, full_name, role, organisation_id) values
  (:'owner_id', 'Fixture Owner', 'platform_owner', null),
  (:'admin_a_id', 'Fixture Admin A', 'admin', null),
  (:'admin_b_id', 'Fixture Admin B', 'admin', null),
  (:'unassigned_id', 'Fixture Unassigned', 'admin', null),
  (:'customer_a_id', 'Fixture Customer A', 'customer', '11111111-1111-4111-8111-111111111111'),
  (:'customer_b_id', 'Fixture Customer B', 'customer', '22222222-2222-4222-8222-222222222222');
insert into public.admin_organisation_assignments (admin_id, organisation_id) values
  (:'admin_a_id', '11111111-1111-4111-8111-111111111111'),
  (:'admin_b_id', '22222222-2222-4222-8222-222222222222');

-- Assert ACLs separately from policies; mutations must not rely on UI hiding.
do $$
declare table_name text; actor text; operation text; function_name text;
begin
  foreach table_name in array array['organisations','profiles','admin_organisation_assignments'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass) then
      raise exception 'RLS not enabled on %', table_name;
    end if;
    foreach actor in array array['anon','authenticated','service_role'] loop
      foreach operation in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(actor, 'public.' || table_name, operation) then
          raise exception 'Unexpected % privilege for % on %', operation, actor, table_name;
        end if;
      end loop;
    end loop;
    if not has_table_privilege('authenticated', 'public.' || table_name, 'SELECT') then
      raise exception 'Authenticated SELECT missing on %', table_name;
    end if;
    foreach actor in array array['anon','service_role'] loop
      if has_table_privilege(actor, 'public.' || table_name, 'SELECT') then
        raise exception 'Unexpected SELECT privilege for % on %', actor, table_name;
      end if;
    end loop;
  end loop;
  foreach function_name in array array[
    'private.current_app_role()',
    'private.current_customer_organisation_id()',
    'private.is_assigned_admin(uuid)'
  ] loop
    if not has_function_privilege('authenticated', function_name, 'EXECUTE') then
      raise exception 'Authenticated EXECUTE missing on %', function_name;
    end if;
    foreach actor in array array['anon','service_role'] loop
      if has_function_privilege(actor, function_name, 'EXECUTE') then
        raise exception 'Unexpected EXECUTE privilege for % on %', actor, function_name;
      end if;
    end loop;
  end loop;
end;
$$;

set local role anon;
do $$
begin
  begin perform * from public.organisations; raise exception 'Anonymous read succeeded';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

-- An authenticated database role without a JWT subject has no application access.
select set_config('request.jwt.claim.sub', '', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  if exists(select 1 from public.organisations) or exists(select 1 from public.profiles)
     or exists(select 1 from public.admin_organisation_assignments) then raise exception 'Missing JWT subject grants access'; end if;
end;
$$;
reset role;

-- Customer A: own profile/organisation only; metadata cannot promote them.
select set_config('request.jwt.claim.sub', :'customer_a_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'customer_a_id', 'role', 'authenticated', 'user_metadata', json_build_object('role', 'platform_owner'))::text, true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.organisations) <> 1 or
     not exists (select 1 from public.organisations where id = '11111111-1111-4111-8111-111111111111') then raise exception 'Customer tenant isolation failed'; end if;
  if (select count(*) from public.profiles) <> 1 or
     not exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Customer profile isolation failed'; end if;
  if exists (select 1 from public.admin_organisation_assignments) then raise exception 'Customer can read assignments'; end if;
  begin update public.profiles set role = 'platform_owner', organisation_id = null where id = auth.uid(); raise exception 'Self-promotion succeeded';
  exception when insufficient_privilege then null; end;
  begin insert into public.organisations(name) values ('Unexpected'); raise exception 'Organisation insert succeeded';
  exception when insufficient_privilege then null; end;
  begin delete from public.profiles where id = auth.uid(); raise exception 'Profile deletion succeeded';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

-- Customer B independently sees B, never A.
select set_config('request.jwt.claim.sub', :'customer_b_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'customer_b_id', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.organisations) <> 1 or
     exists (select 1 from public.organisations where id = '11111111-1111-4111-8111-111111111111') then raise exception 'Customer B isolation failed'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'Customer B profile isolation failed'; end if;
end;
$$;
reset role;

-- Assigned Admin: own profile plus A Customer, own assignment, only A.
select set_config('request.jwt.claim.sub', :'admin_a_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'admin_a_id', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.organisations) <> 1 or
     exists (select 1 from public.organisations where id = '22222222-2222-4222-8222-222222222222') then raise exception 'Admin tenant isolation failed'; end if;
  if (select count(*) from public.profiles) <> 2 or
     exists (select 1 from public.profiles where role = 'platform_owner' or id = current_setting('test.admin_b')::uuid) then raise exception 'Admin profile visibility failed'; end if;
  if (select count(*) from public.admin_organisation_assignments) <> 1 then raise exception 'Admin assignment visibility failed'; end if;
  begin insert into public.admin_organisation_assignments(admin_id,organisation_id) values(auth.uid(),'22222222-2222-4222-8222-222222222222'); raise exception 'Admin self-assignment succeeded';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

-- Assignment removal is effective with the SAME claims/session.
delete from public.admin_organisation_assignments where admin_id = :'admin_a_id';
set local role authenticated;
do $$
begin
  if exists (select 1 from public.organisations) or
     exists (select 1 from public.admin_organisation_assignments) or
     (select count(*) from public.profiles) <> 1 then raise exception 'Removed assignment still grants access'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', :'unassigned_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'unassigned_id', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if exists(select 1 from public.organisations) or exists(select 1 from public.admin_organisation_assignments)
     or (select count(*) from public.profiles) <> 1 then raise exception 'Unassigned Admin has extra access'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', :'missing_profile_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'missing_profile_id', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if exists(select 1 from public.organisations) or exists(select 1 from public.profiles)
     or exists(select 1 from public.admin_organisation_assignments) then raise exception 'Missing profile grants access'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', :'owner_id', true),
       set_config('request.jwt.claim.role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', :'owner_id', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.organisations where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')) <> 2 then raise exception 'Owner organisation visibility failed'; end if;
  if not exists(select 1 from public.profiles where id = current_setting('test.admin_b')::uuid)
     or not exists(select 1 from public.profiles where id = current_setting('test.customer_b')::uuid) then raise exception 'Owner profile visibility failed'; end if;
  if not exists(select 1 from public.admin_organisation_assignments where admin_id = current_setting('test.admin_b')::uuid) then raise exception 'Owner assignment visibility failed'; end if;
  begin update public.profiles set full_name = 'Unexpected' where id = auth.uid(); raise exception 'Owner API mutation succeeded';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

-- Constraints must also protect privileged writes (RLS bypass does not bypass FKs).
do $$
begin
  begin insert into public.organisations(name) values ('   '); raise exception 'Blank organisation name accepted';
  exception when check_violation then null; end;
  begin update public.profiles set role = 'invented' where id = current_setting('test.customer_a')::uuid; raise exception 'Unknown role accepted';
  exception when invalid_text_representation then null; end;
  begin update public.profiles set organisation_id = '33333333-3333-4333-8333-333333333333' where id = current_setting('test.customer_a')::uuid; raise exception 'Nonexistent tenant accepted';
  exception when foreign_key_violation then null; end;
  begin update public.profiles set organisation_id = null where id = current_setting('test.customer_a')::uuid; raise exception 'Customer without tenant accepted';
  exception when check_violation then null; end;
  begin update public.profiles set organisation_id = '11111111-1111-4111-8111-111111111111' where id = current_setting('test.owner')::uuid; raise exception 'Owner with tenant accepted';
  exception when check_violation then null; end;
  begin insert into public.admin_organisation_assignments(admin_id,organisation_id) values(current_setting('test.customer_a')::uuid,'11111111-1111-4111-8111-111111111111'); raise exception 'Customer assignment accepted';
  exception when foreign_key_violation then null; end;
  begin update public.profiles set role = 'platform_owner' where id = current_setting('test.admin_b')::uuid; raise exception 'Assigned Admin role change accepted';
  exception when foreign_key_violation then null; end;
  begin insert into public.admin_organisation_assignments(admin_id,organisation_id) values(current_setting('test.admin_b')::uuid,'22222222-2222-4222-8222-222222222222'); raise exception 'Duplicate assignment accepted';
  exception when unique_violation then null; end;
  begin delete from public.organisations where id = '11111111-1111-4111-8111-111111111111'; raise exception 'Referenced tenant deletion accepted';
  exception when foreign_key_violation then null; end;
end;
$$;
rollback;
\echo 'Identity foundation SQL assertions passed; fixture application rows rolled back.'
