import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const sql = readFileSync(new URL('../../supabase/migrations/20260926000100_public_recruitment.sql', import.meta.url), 'utf8');

test('Public recruitment migration defaults to private drafts and unique URL-safe identifiers', () => {
  assert.match(sql, /status public\.job_status not null default 'draft'/);
  assert.match(sql, /public_id uuid not null default gen_random_uuid\(\) unique/);
  assert.match(sql, /organisations_careers_slug_key unique/);
  assert.match(sql, /Public Job identifier is immutable/);
  assert.match(sql, /job_state='published' and \(deadline is null or deadline>statement_timestamp\(\)\)/);
  assert.doesNotMatch(sql, /grant .* to anon|disable row level security|alter table storage\.|create policy .* on storage\./i);
});

test('Assessment persistence requires and locks both input versions, with no legacy overload', () => {
  assert.match(sql, /drop function public\.save_candidate_assessment\(uuid,uuid,jsonb\)/);
  assert.match(sql, /current_job_version is distinct from target_job_content_version/);
  assert.match(sql, /current_version is distinct from target_cv_object_id/);
  assert.match(sql, /where j.id=target.job_id and j.organisation_id=target.organisation_id for share/);
  assert.match(sql, /where cv.candidate_id=target.candidate_id and cv.organisation_id=target.organisation_id for share/);
  assert.match(sql, /cv.object_id=cv_object_id and j.content_version=job_content_version/);
  assert.match(sql, /job_content_version=excluded.job_content_version/);
});

test('Invalidation is trigger-only, tenant-scoped and never changes recruitment stage', () => {
  assert.match(sql, /where job_id=new.id and organisation_id=new.organisation_id/);
  assert.match(sql, /where candidate_id=new.candidate_id and organisation_id=new.organisation_id/);
  assert.match(sql, /revoke all on function private.stale_job_assessments\(\),private.stale_cv_assessments\(\) from public,anon,authenticated,service_role/);
  assert.doesNotMatch(sql, /set stage\s*=|grant update \([^)]*(?:assessment_status|source|content_version|public_id)/i);
  assert.match(sql, /grant update \(removed_at\) on public.applications to authenticated/);
  assert.doesNotMatch(sql, /delete from public\.(?:applications|candidates|candidate_assessments)/i);
});

test('Job editing uses the existing tenant model and grants only editable columns', () => {
  const policy = sql.slice(sql.indexOf('create policy jobs_update'), sql.indexOf('alter table public.applications'));
  for (const helper of ['current_app_role', 'current_customer_organisation_id', 'is_assigned_admin']) {
    assert.equal(policy.split(helper).length - 1, 2);
  }
  assert.match(policy, /grant update \(title,description,status,closes_at\)/);
  assert.doesNotMatch(sql, /grant update \([^)]*description_rich/i);
  assert.match(sql, /new.content_version := old.content_version \+ 1/);
  assert.match(sql, /new.teaser := null/);
});
