-- REVIEW ONLY. Creates private storage resources only when explicitly applied.
-- FR-033/100/101/102/103; QR-SEC-001/003/005/008.
begin;
create table public.candidate_cvs (
  candidate_id uuid primary key,
  organisation_id uuid not null,
  object_id uuid not null,
  byte_size integer not null check (byte_size between 1 and 5242880),
  updated_at timestamptz not null default now(),
  storage_path text generated always as
    (organisation_id::text || '/' || candidate_id::text || '/' || object_id::text || '.pdf') stored,
  constraint candidate_cvs_candidate_fkey foreign key (organisation_id,candidate_id)
    references public.candidates(organisation_id,id) on update restrict on delete restrict,
  unique (storage_path)
);
create index candidate_cvs_organisation_idx on public.candidate_cvs(organisation_id);
create trigger candidate_cvs_updated_at before update on public.candidate_cvs
  for each row execute function private.set_updated_at();
alter table public.candidate_cvs enable row level security;
revoke all on public.candidate_cvs from public,anon,authenticated,service_role;
grant select on public.candidate_cvs to authenticated;
grant insert (candidate_id,organisation_id,object_id,byte_size) on public.candidate_cvs to authenticated;
grant update (object_id,byte_size) on public.candidate_cvs to authenticated;
create policy candidate_cvs_select on public.candidate_cvs for select to authenticated
 using (exists(select 1 from public.candidates c where c.id=candidate_id and c.organisation_id=candidate_cvs.organisation_id));
create policy candidate_cvs_insert on public.candidate_cvs for insert to authenticated
 with check (exists(select 1 from public.candidates c where c.id=candidate_id and c.organisation_id=candidate_cvs.organisation_id));
create policy candidate_cvs_update on public.candidate_cvs for update to authenticated
 using (exists(select 1 from public.candidates c where c.id=candidate_id and c.organisation_id=candidate_cvs.organisation_id))
 with check (exists(select 1 from public.candidates c where c.id=candidate_id and c.organisation_id=candidate_cvs.organisation_id));

-- Abort if this bucket already exists: never silently change an existing bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('candidate-cvs','candidate-cvs',false,5242880,array['application/pdf']);

-- Invoker helper relies on Candidate RLS. No casts of untrusted path segments.
create function private.can_access_candidate_cv(object_name text)
returns boolean language sql stable security invoker set search_path = '' as $$
 select object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]pdf$'
 and exists(select 1 from public.candidates c
   where c.organisation_id::text=split_part(object_name,'/',1)
     and c.id::text=split_part(object_name,'/',2));
$$;
alter function private.can_access_candidate_cv(text) owner to postgres;
revoke all on function private.can_access_candidate_cv(text) from public,anon,authenticated,service_role;
grant execute on function private.can_access_candidate_cv(text) to authenticated;

-- No Storage UPDATE/upsert. New immutable object for every replacement.
create policy cv_objects_select on storage.objects for select to authenticated
 using (bucket_id='candidate-cvs' and private.can_access_candidate_cv(name));
create policy cv_objects_insert on storage.objects for insert to authenticated
 with check (bucket_id='candidate-cvs' and private.can_access_candidate_cv(name));
create policy cv_objects_delete on storage.objects for delete to authenticated
 using (bucket_id='candidate-cvs' and private.can_access_candidate_cv(name));
-- Limit this bucket even if another permissive authenticated policy exists.
-- Other buckets keep their own policies. Anonymous gets no permitting policy.
create policy cv_objects_select_guard on storage.objects as restrictive for select to authenticated
 using (bucket_id<>'candidate-cvs' or private.can_access_candidate_cv(name));
create policy cv_objects_insert_guard on storage.objects as restrictive for insert to authenticated
 with check (bucket_id<>'candidate-cvs' or private.can_access_candidate_cv(name));
create policy cv_objects_delete_guard on storage.objects as restrictive for delete to authenticated
 using (bucket_id<>'candidate-cvs' or private.can_access_candidate_cv(name));
create policy cv_objects_update_guard on storage.objects as restrictive for update to authenticated
 using (bucket_id<>'candidate-cvs') with check (bucket_id<>'candidate-cvs');
create policy cv_objects_anon_guard on storage.objects as restrictive for all to anon
 using (bucket_id<>'candidate-cvs') with check (bucket_id<>'candidate-cvs');

-- One latest validated result per Application, not an assessment history.
alter table public.applications add constraint applications_organisation_id_key unique (organisation_id,id);
create table public.candidate_assessments (
  application_id uuid primary key,
  organisation_id uuid not null,
  cv_object_id uuid not null,
  result jsonb not null check (jsonb_typeof(result)='object' and octet_length(result::text)<=65536),
  assessed_at timestamptz not null default now(),
  constraint candidate_assessments_application_fkey foreign key (organisation_id,application_id)
    references public.applications(organisation_id,id) on update restrict on delete restrict
);
create index candidate_assessments_organisation_idx on public.candidate_assessments(organisation_id);
alter table public.candidate_assessments enable row level security;
revoke all on public.candidate_assessments from public,anon,authenticated,service_role;
grant select on public.candidate_assessments to authenticated;
-- Applications/CV metadata independently enforce tenant RLS. Stale results are hidden.
create policy candidate_assessments_select on public.candidate_assessments for select to authenticated
 using (exists(select 1 from public.applications a join public.candidate_cvs cv
   on cv.candidate_id=a.candidate_id and cv.organisation_id=a.organisation_id
   where a.id=application_id and a.organisation_id=candidate_assessments.organisation_id
     and cv.object_id=cv_object_id));

create function public.save_candidate_assessment(target_application_id uuid, target_cv_object_id uuid, validated_result jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; target public.applications%rowtype; current_version uuid; item jsonb; field text;
begin
 select p.* into actor from public.profiles p where p.id=auth.uid() for share;
 if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 select a.* into target from public.applications a where a.id=target_application_id for share;
 if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 if actor.role='customer' then
   if actor.organisation_id is distinct from target.organisation_id then raise exception 'Not authorised' using errcode='42501'; end if;
 elsif actor.role='admin' then
   perform 1 from public.admin_organisation_assignments a where a.admin_id=actor.id and a.organisation_id=target.organisation_id for share;
   if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 elsif actor.role is distinct from 'platform_owner'::public.app_role then
   raise exception 'Not authorised' using errcode='42501';
 end if;
 -- Existing Application composite FKs guarantee Candidate/Job tenant agreement.
 select cv.object_id into current_version from public.candidate_cvs cv
   where cv.candidate_id=target.candidate_id and cv.organisation_id=target.organisation_id for share;
 if not found or current_version is distinct from target_cv_object_id then raise exception 'CV changed' using errcode='22023'; end if;
 if jsonb_typeof(validated_result) is distinct from 'object' or octet_length(validated_result::text)>65536 then raise exception 'Invalid result' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(validated_result))<>6
   or not (validated_result ?& array['score','summary','strengths','gaps','recommendation','disclaimer']) then raise exception 'Invalid result' using errcode='22023'; end if;
 if jsonb_typeof(validated_result->'score') is distinct from 'number' then raise exception 'Invalid score' using errcode='22023'; end if;
 if (validated_result->>'score')::numeric not between 0 and 100
   or trunc((validated_result->>'score')::numeric)<>(validated_result->>'score')::numeric then raise exception 'Invalid score' using errcode='22023'; end if;
 if jsonb_typeof(validated_result->'summary') is distinct from 'string'
   or char_length(btrim(validated_result->>'summary')) not between 1 and 1200 then raise exception 'Invalid summary' using errcode='22023'; end if;
 foreach field in array array['strengths','gaps'] loop
   if jsonb_typeof(validated_result->field) is distinct from 'array' then raise exception 'Invalid list' using errcode='22023'; end if;
   if jsonb_array_length(validated_result->field)>8 then raise exception 'Invalid list' using errcode='22023'; end if;
   for item in select value from jsonb_array_elements(validated_result->field) loop
     if jsonb_typeof(item) is distinct from 'string' or char_length(btrim(item#>>'{}')) not between 1 and 400 then raise exception 'Invalid list item' using errcode='22023'; end if;
   end loop;
 end loop;
 if (validated_result->>'recommendation') is null or (validated_result->>'recommendation') not in ('strong_match','potential_match','weak_match')
   or (validated_result->>'disclaimer') is distinct from 'AI-assisted assessment. Human recruiter judgement is required. This is not a hiring decision.' then raise exception 'Invalid result' using errcode='22023'; end if;
 insert into public.candidate_assessments(application_id,organisation_id,cv_object_id,result)
 values(target.id,target.organisation_id,current_version,validated_result)
 on conflict(application_id) do update set cv_object_id=excluded.cv_object_id,result=excluded.result,assessed_at=now();
 return target.id;
end;
$$;
alter function public.save_candidate_assessment(uuid,uuid,jsonb) owner to postgres;
revoke all on function public.save_candidate_assessment(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_candidate_assessment(uuid,uuid,jsonb) to authenticated;
commit;
