-- Milestone 3. No table, policy, role, or direct-write privilege changes.
begin;

create function public.provision_customer_organisation(
  target_auth_user_id uuid, organisation_name text, customer_full_name text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor_role public.app_role;
  new_organisation_id uuid;
begin
  -- Hold the trusted role stable for this transaction.
  select p.role into actor_role from public.profiles p
    where p.id = auth.uid() for share;
  if actor_role is distinct from 'platform_owner'::public.app_role then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  insert into public.organisations (name) values (organisation_name)
    returning id into new_organisation_id;
  insert into public.profiles (id, full_name, role, organisation_id)
    values (target_auth_user_id, customer_full_name, 'customer', new_organisation_id);
  return new_organisation_id;
end;
$$;

create function public.provision_customer_for_organisation(
  target_auth_user_id uuid, organisation_id uuid, customer_full_name text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor_role public.app_role;
begin
  select p.role into actor_role from public.profiles p
    where p.id = auth.uid() for share;
  if actor_role = 'admin'::public.app_role then
    -- A concurrent unassignment must wait for an already-authorised operation.
    -- After unassignment commits, new calls fail this check.
    perform 1 from public.admin_organisation_assignments a
      where a.admin_id = auth.uid()
        and a.organisation_id = provision_customer_for_organisation.organisation_id
      for share;
    if not found then
      raise exception 'Not authorised' using errcode = '42501';
    end if;
  elsif actor_role is distinct from 'platform_owner'::public.app_role then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  insert into public.profiles (id, full_name, role, organisation_id)
    values (target_auth_user_id, customer_full_name, 'customer', provision_customer_for_organisation.organisation_id);
  return target_auth_user_id;
end;
$$;

create function public.provision_admin(target_auth_user_id uuid, admin_full_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor_role public.app_role;
begin
  select p.role into actor_role from public.profiles p
    where p.id = auth.uid() for share;
  if actor_role is distinct from 'platform_owner'::public.app_role then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  insert into public.profiles (id, full_name, role, organisation_id)
    values (target_auth_user_id, admin_full_name, 'admin', null);
  return target_auth_user_id;
end;
$$;

create function public.assign_admin_to_organisation(admin_id uuid, organisation_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare actor_role public.app_role;
begin
  select p.role into actor_role from public.profiles p
    where p.id = auth.uid() for share;
  if actor_role is distinct from 'platform_owner'::public.app_role then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  -- The composite FK permits Admin profiles only. Duplicate assignment is safe.
  insert into public.admin_organisation_assignments (admin_id, organisation_id)
    values (assign_admin_to_organisation.admin_id, assign_admin_to_organisation.organisation_id)
    on conflict on constraint admin_organisation_assignments_pkey do nothing;
end;
$$;

create function public.unassign_admin_from_organisation(admin_id uuid, organisation_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare actor_role public.app_role;
begin
  select p.role into actor_role from public.profiles p
    where p.id = auth.uid() for share;
  if actor_role is distinct from 'platform_owner'::public.app_role then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  delete from public.admin_organisation_assignments a
    where a.admin_id = unassign_admin_from_organisation.admin_id
      and a.organisation_id = unassign_admin_from_organisation.organisation_id;
end;
$$;

alter function public.provision_customer_organisation(uuid, text, text) owner to postgres;
alter function public.provision_customer_for_organisation(uuid, uuid, text) owner to postgres;
alter function public.provision_admin(uuid, text) owner to postgres;
alter function public.assign_admin_to_organisation(uuid, uuid) owner to postgres;
alter function public.unassign_admin_from_organisation(uuid, uuid) owner to postgres;

revoke all on function public.provision_customer_organisation(uuid, text, text) from public, anon, service_role;
revoke all on function public.provision_customer_for_organisation(uuid, uuid, text) from public, anon, service_role;
revoke all on function public.provision_admin(uuid, text) from public, anon, service_role;
revoke all on function public.assign_admin_to_organisation(uuid, uuid) from public, anon, service_role;
revoke all on function public.unassign_admin_from_organisation(uuid, uuid) from public, anon, service_role;

grant execute on function public.provision_customer_organisation(uuid, text, text) to authenticated;
grant execute on function public.provision_customer_for_organisation(uuid, uuid, text) to authenticated;
grant execute on function public.provision_admin(uuid, text) to authenticated;
grant execute on function public.assign_admin_to_organisation(uuid, uuid) to authenticated;
grant execute on function public.unassign_admin_from_organisation(uuid, uuid) to authenticated;

commit;
