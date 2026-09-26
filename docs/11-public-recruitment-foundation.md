# Public recruitment — Phase 1

Phase 1 domain/database foundation. FR-022–025/040–045/090–096/070/071/073;
QR-SEC-001/002/003/005/006/007. No public access, UI, provider call or deployment.

- Existing/new Jobs default to draft. UUID public IDs are generated and immutable.
  `private.job_is_publicly_open` evaluates published status and a strictly future
  or absent deadline at statement time. It does not authorize reads.
- Careers slugs default to `org-<random UUID without hyphens>`, including existing
  Organisations. Unique lowercase URL-safe values do not depend on company names.
  No new Organisation mutation grants or slug-edit workflow.
- Existing `description` remains plain text; future rich editing must derive it
  from `description_rich`. Rich JSON is bounded to 128 KiB and an object; this is
  storage preparation, not editor schema validation or HTML sanitisation. The
  column has no direct authenticated INSERT/UPDATE grant and remains database-owned
  pending server-mediated writes. Phase 2 will introduce a narrow validated
  Job-content write boundary/RPC after the Tiptap document schema is defined and
  validated; that boundary must also derive the plain text.
  `teaser` is reserved, bounded to 500 characters and has no client write grant.
- Content versions start at 1. Title/plain-description changes ignore whitespace
  differences and blank/null equivalence. Rich JSON changes conservatively bump
  the version. A substantive edit clears the teaser. Lifecycle/deadline changes
  do not bump the content version. `updated_at` is NULL for untouched Jobs;
  publishing records the latest publication time and clears `closed_at`, closing
  records the closure time. Expiry affects openness without rewriting lifecycle.
- Application source defaults to manual; public is reserved for later trusted
  submission code. `removed_at` is reversible and the existing pipeline loader
  excludes it. Candidate and Application records/uniqueness are retained.
- Assessment status starts at not_ready (no assessment run yet). Pending/failed
  are reserved for later orchestration; Phase 1 adds no asynchronous workflow.
  Successful persistence sets completed. CV replacement/Job content edits mark
  previously pending/completed/failed Applications stale, never changing stages.
- Existing results are backfilled with Job version 1 because Jobs were immutable
  under previous client grants. Existing mismatched CV results backfill stale.
  RLS hides results unless Application, current CV and current Job version match.
- The old three-argument assessment RPC is removed. The existing caller now sends
  the version read before assessment. Persistence locks Job and CV inputs before
  writing the result/status, rejects stale versions, and retains the original
  trusted actor/assignment checks and JSON validation. Deploy the compatible
  application before using the updated assessment workflow; old callers fail closed.
  The migration is now applied; application deployment remains deliberately deferred.

Jobs gain UPDATE RLS using the existing Customer/assigned Admin/Owner predicates.
Only title, description, status and deadline receive UPDATE grants.
Authenticated actors cannot directly update description_rich, even in their own
Organisation; the SQL acceptance suite asserts both the ACL and permission denial.
Applications add only removed_at to existing UPDATE grants. Source/status/version/
identity/timestamps are protected. Trigger-only definer functions have an empty
search_path and no client EXECUTE. Storage, relationship FKs and existing tenant
policies remain unchanged apart from tightening assessment SELECT validity.

`supabase/tests/public_recruitment.sql` is transactional and rolls fixtures back.
It uses four disposable confirmed Auth identities without profiles (same contract
as the existing CV suite); it does not write Auth identities or Storage objects.
Existing recruitment/CV SQL suites reflect the new column grants/RPC signature.
Offline Node tests cover caller/reader version propagation and migration contracts.
Local PostgreSQL with minimal Auth/Storage schema stand-ins can validate SQL and
RLS, but managed Supabase and Storage HTTP verification remain separate gates.

Initial local verification: lint, typecheck, 65/65 offline tests, production
Docker build (`work-track:public-recruitment-review`) and `git diff --check` passed.
The recruitment, CV/assessment and public-recruitment transactional SQL suites
passed in isolated network-disabled PostgreSQL 15 with minimal Auth/Storage
stand-ins. A separate pre-existing-data upgrade check passed for duplicate/non-Latin
Organisation names, preserved Job descriptions/stages and current/stale assessment
backfills. Earlier applied migration files are unchanged. This initial local
checkpoint preceded the managed verification below.

## Managed verification — 26 September 2026

The linked-project history and `db push --linked --dry-run --skip-vault` confirmed
`20260926000100_public_recruitment.sql` was the only pending migration. Only that
migration was applied, with no seeds, roles or Vault updates. Remote history now
contains all five local versions, including `20260926000100`. Applied migration
SHA-256: `2370b32f12a31fb09a1e67777278cf215f135a02ec9a7f8aa65cb9fc1389de4f`.

All three updated transactional suites (`recruitment_core`, `cv_assessment`,
`public_recruitment`) passed against managed Supabase. Five disposable confirmed
Auth identities were created through trusted Auth administration, SQL fixtures
rolled back, and all five identities were deleted with deletion independently
confirmed. The CV suite's stale-result assertion is scoped to its fixture so a
retained demo assessment does not cause a false failure.

Private before/after comparisons verified preservation of all retained IDs and
original fields: 3 Organisations, 13 Jobs, 7 Candidates, 7 Applications, 1 CV
metadata record and 1 assessment. All 13 Jobs backfilled as draft; careers slugs
are unique. Only the intended new fields and the existing assessment's Application
updated_at changed during backfill. Pipeline stages and assessment output remained
unchanged. After test cleanup, all rows exactly matched the post-upgrade baseline,
including 6 Auth users/profiles, 2 Admin assignments, the private bucket and its
single Storage object. No CV bytes or Storage objects were written by these tests.

Acceptance explicitly covered authenticated description_rich UPDATE denial,
cross-tenant and revoked-Admin lifecycle UPDATE denial, immutable public_id,
reversible removed_at, stale CV/Job version rejection and hidden stale results,
with no automatic stage changes. No application deployment or main-branch merge.

Final local gate after managed verification: lint and typecheck passed; all 65
Node tests passed (zero failures/skips); Docker build passed with image
`sha256:10322ff301f1724a68f6d533192a7f040aa96341f1e92be47e147ea7a4c9d611`;
`git diff --check` passed. Secret checks scanned all 189 tracked/proposed files
and browser assets for configured private credentials and private-key/token
patterns; none found. `.env.local` is ignored and excluded from the Docker build.
