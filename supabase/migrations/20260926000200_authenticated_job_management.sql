-- Phase 2A: FR-020/021/022/025/090; actor-authenticated Job management only.
-- Review checkpoint: do not apply remotely until approved.
begin;

-- Recursive validator for the deliberately small Tiptap subset. Not callable by clients.
create function private.job_node_text(node jsonb, depth integer)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare kind text; child jsonb; child_kind text; mark jsonb; marks text[] := '{}';
 result text := ''; children jsonb; allowed text[];
begin
 if depth>8 or jsonb_typeof(node) is distinct from 'object' or jsonb_typeof(node->'type') is distinct from 'string' then
  raise exception 'Invalid Job document' using errcode='22023';
 end if;
 kind:=node->>'type';
 allowed:=case kind when 'text' then array['type','text','marks']
   when 'heading' then array['type','attrs','content'] when 'orderedList' then array['type','attrs','content']
   when 'hardBreak' then array['type'] else array['type','content'] end;
 if (node-allowed)<>'{}'::jsonb then raise exception 'Invalid Job document fields' using errcode='22023'; end if;
 if kind='text' then
  if jsonb_typeof(node->'text') is distinct from 'string' or char_length(node->>'text') not between 1 and 20000
    or regexp_replace(node->>'text',E'[\n\r\t]','','g') ~ '[[:cntrl:]]' then
   raise exception 'Invalid Job text' using errcode='22023';
  end if;
  if node ? 'marks' then
   if jsonb_typeof(node->'marks') is distinct from 'array' then raise exception 'Invalid marks' using errcode='22023'; end if;
   if jsonb_array_length(node->'marks')>4 then raise exception 'Invalid marks' using errcode='22023'; end if;
   for mark in select value from jsonb_array_elements(node->'marks') loop
    if jsonb_typeof(mark) is distinct from 'object' or (mark-array['type'])<>'{}'::jsonb
      or jsonb_typeof(mark->'type') is distinct from 'string' or mark->>'type' not in ('bold','italic','strike','code')
      or mark->>'type'=any(marks) then raise exception 'Invalid marks' using errcode='22023'; end if;
    marks:=array_append(marks,mark->>'type');
   end loop;
  end if;
  return node->>'text';
 elsif kind='hardBreak' then return E'\n';
 elsif kind not in ('doc','paragraph','heading','bulletList','orderedList','listItem') then
  raise exception 'Unsupported Job node' using errcode='22023';
 end if;
 if kind='heading' then
  if jsonb_typeof(node->'attrs') is distinct from 'object' or ((node->'attrs')-array['level'])<>'{}'::jsonb
    or node->'attrs'->'level' not in ('2'::jsonb,'3'::jsonb) or not (node->'attrs' ? 'level') then
   raise exception 'Invalid heading' using errcode='22023';
  end if;
 elsif kind='orderedList' and node ? 'attrs' then
  if jsonb_typeof(node->'attrs') is distinct from 'object' or ((node->'attrs')-array['start'])<>'{}'::jsonb
    or jsonb_typeof(node->'attrs'->'start') is distinct from 'number' then raise exception 'Invalid list start' using errcode='22023'; end if;
  if (node->'attrs'->>'start')::numeric not between 1 and 1000000
    or trunc((node->'attrs'->>'start')::numeric)<>(node->'attrs'->>'start')::numeric then raise exception 'Invalid list start' using errcode='22023'; end if;
 end if;
 children:=case when node ? 'content' then node->'content' else '[]'::jsonb end;
 if jsonb_typeof(children) is distinct from 'array' then raise exception 'Invalid Job content' using errcode='22023'; end if;
 if jsonb_array_length(children)>100 or (kind not in ('paragraph','heading') and jsonb_array_length(children)=0) then
  raise exception 'Invalid Job children' using errcode='22023';
 end if;
 if kind='listItem' and children->0->>'type' is distinct from 'paragraph' then raise exception 'List item requires paragraph' using errcode='22023'; end if;
 for child in select value from jsonb_array_elements(children) loop
  child_kind:=child->>'type';
  if child_kind is null or
    (kind in ('doc','listItem') and child_kind not in ('paragraph','heading','bulletList','orderedList')) or
    (kind in ('paragraph','heading') and child_kind not in ('text','hardBreak')) or
    (kind in ('bulletList','orderedList') and child_kind<>'listItem') then
   raise exception 'Invalid Job nesting' using errcode='22023';
  end if;
  result:=result||private.job_node_text(child,depth+1);
 end loop;
 if kind in ('paragraph','heading') then result:=result||E'\n'; end if;
 return result;
end;
$$;
create function private.job_document_text(document jsonb)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare result text; node_count integer;
begin
 if document is null or octet_length(document::text)>65536 or document->>'type' is distinct from 'doc' then
  raise exception 'Invalid Job document' using errcode='22023';
 end if;
 with recursive nodes(node,depth) as (
  select document,0 union all
  select child.value,n.depth+1 from nodes n cross join lateral jsonb_array_elements(
    case when jsonb_typeof(n.node->'content')='array' then n.node->'content' else '[]'::jsonb end) child
    where n.depth<=8
 ) select count(*) into node_count from nodes;
 if node_count>1000 then raise exception 'Too many Job nodes' using errcode='22023'; end if;
 result:=btrim(private.job_node_text(document,0),E' \t\r\n');
 if char_length(result)>20000 then raise exception 'Job description too long' using errcode='22023'; end if;
 return result;
end;
$$;
alter function private.job_node_text(jsonb,integer) owner to postgres;
alter function private.job_document_text(jsonb) owner to postgres;
revoke all on function private.job_node_text(jsonb,integer),private.job_document_text(jsonb) from public,anon,authenticated,service_role;

-- Tighten existing direct writes: otherwise callers could bypass content validation,
-- derived text and lifecycle rules. SELECT RLS remains unchanged.
revoke insert (organisation_id,title,description) on public.jobs from authenticated;
revoke update (title,description,status,closes_at) on public.jobs from authenticated;

create function public.save_job_content(target_organisation_id uuid, target_job_id uuid,
 job_title text, job_document jsonb, job_closes_at timestamptz,
 expected_content_version integer, draft_only boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; target public.jobs%rowtype; tenant uuid;
 plain_text text; saved_id uuid;
begin
 select p.* into actor from public.profiles p where p.id=auth.uid() for share;
 if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 if actor.role='customer' then
  tenant:=actor.organisation_id;
  if target_organisation_id is distinct from tenant then raise exception 'Not authorised' using errcode='42501'; end if;
 elsif actor.role='admin' then
  tenant:=target_organisation_id;
  perform 1 from public.admin_organisation_assignments a where a.admin_id=actor.id and a.organisation_id=tenant for share;
  if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 elsif actor.role='platform_owner' then tenant:=target_organisation_id;
 else raise exception 'Not authorised' using errcode='42501'; end if;
 if tenant is null or not exists(select 1 from public.organisations where id=tenant) then raise exception 'Not authorised' using errcode='42501'; end if;
 if draft_only is null then raise exception 'Invalid operation' using errcode='22023'; end if;
 if target_job_id is not null then
  select j.* into target from public.jobs j where j.id=target_job_id and j.organisation_id=tenant for update;
  if not found then raise exception 'Not authorised' using errcode='42501'; end if;
  if target.content_version is distinct from expected_content_version then raise exception 'Job changed; reload' using errcode='40001'; end if;
  if target.status not in ('draft','published') or (draft_only and target.status<>'draft') then
   raise exception 'Job is not editable in this state' using errcode='22023'; end if;
 elsif expected_content_version is not null or not draft_only then raise exception 'Invalid draft creation' using errcode='22023'; end if;
 if job_title is null or job_title<>btrim(job_title) or char_length(job_title) not between 1 and 200
   or job_title ~ '[[:cntrl:]]' then raise exception 'Invalid Job title' using errcode='22023'; end if;
 if job_closes_at is not null and (not isfinite(job_closes_at) or job_closes_at<=clock_timestamp()) then
  raise exception 'Closing date must be in the future' using errcode='22023'; end if;
 plain_text:=private.job_document_text(job_document);
 if target.status='published' and (job_title !~ '[[:alnum:]]' or plain_text !~ '[[:alnum:]]') then
  raise exception 'Published Job requires meaningful content' using errcode='22023'; end if;
 if target_job_id is null then
  insert into public.jobs(organisation_id,title,description,description_rich,closes_at)
   values(tenant,job_title,plain_text,job_document,job_closes_at) returning id into saved_id;
 else
  update public.jobs set title=job_title,description=plain_text,description_rich=job_document,closes_at=job_closes_at
   where id=target.id and organisation_id=tenant returning id into saved_id;
 end if;
 return saved_id;
end;
$$;

create function public.transition_job(target_organisation_id uuid, target_job_id uuid, next_status public.job_status)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; target public.jobs%rowtype; tenant uuid;
begin
 select p.* into actor from public.profiles p where p.id=auth.uid() for share;
 if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 if actor.role='customer' then
  tenant:=actor.organisation_id;
  if target_organisation_id is distinct from tenant then raise exception 'Not authorised' using errcode='42501'; end if;
 elsif actor.role='admin' then
  tenant:=target_organisation_id;
  perform 1 from public.admin_organisation_assignments a where a.admin_id=actor.id and a.organisation_id=tenant for share;
  if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 elsif actor.role='platform_owner' then tenant:=target_organisation_id;
 else raise exception 'Not authorised' using errcode='42501'; end if;
 select j.* into target from public.jobs j where j.id=target_job_id and j.organisation_id=tenant for update;
 if not found then raise exception 'Not authorised' using errcode='42501'; end if;
 if next_status='published' and target.status='draft' then
  if target.title !~ '[[:alnum:]]' or coalesce(target.description,'') !~ '[[:alnum:]]' then
   raise exception 'Job requires meaningful title and description' using errcode='22023'; end if;
  if target.closes_at is not null and (not isfinite(target.closes_at) or target.closes_at<=clock_timestamp()) then
   raise exception 'Closing date must be in the future' using errcode='22023'; end if;
 elsif next_status='closed' and target.status='published' then null;
 elsif next_status='archived' and target.status in ('draft','closed') then null;
 else raise exception 'Invalid Job lifecycle transition' using errcode='22023'; end if;
 update public.jobs set status=next_status where id=target.id and organisation_id=tenant;
 return target.id;
end;
$$;
alter function public.save_job_content(uuid,uuid,text,jsonb,timestamptz,integer,boolean) owner to postgres;
alter function public.transition_job(uuid,uuid,public.job_status) owner to postgres;
revoke all on function public.save_job_content(uuid,uuid,text,jsonb,timestamptz,integer,boolean),public.transition_job(uuid,uuid,public.job_status) from public,anon,authenticated,service_role;
grant execute on function public.save_job_content(uuid,uuid,text,jsonb,timestamptz,integer,boolean),public.transition_job(uuid,uuid,public.job_status) to authenticated;
commit;
