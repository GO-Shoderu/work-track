# ATS Recruitment Core — backend handoff

Review checkpoint: local code and new migration only. No remote execution, Auth
fixtures, browser automation, UI changes, deployment, commit or push.
Milestone 3 is the baseline (`4d0ea0a4859b5c20b2bd08aab91d53127e7bd9f9`).

## Scope and traceability

FR-011/012/014/015, FR-020/021/025/026, FR-030/031/032/035/036,
FR-040–045, FR-050/051/052/054–059 and FR-060/064.
QR-SEC-001/002/003/004/006/007, QR-REL-001/002/003/006,
QR-PERF-002/003/004 and QR-MNT automated-test/maintainability requirements.
No recruitment UI, CV, AI, public endpoints, lifecycle states, editing/deleting
Jobs or Candidates, or new dependencies.

## Migration

`supabase/migrations/20260922000100_recruitment_core.sql` is transactional and
unapplied. Prior migrations and provisioning/authentication implementations
are unchanged.

- `jobs`: generated UUID PK; required Organisation FK and trimmed title
  (1–200 chars); nullable description (20,000 chars); creation timestamp.
- `candidates`: generated UUID PK; Organisation FK; trimmed full name
  (1–200); nullable email (254), phone (50), LinkedIn URL (2048); creation
  timestamp. A Candidate has no Auth identity or profile relationship.
- `applications`: generated UUID PK; Organisation FK; Candidate and Job UUIDs;
  exact six-value `application_stage` enum; default `applied`; creation and
  update timestamps (existing timestamp trigger function reused).
- Composite unique `(organisation_id,id)` on Jobs/Candidates supports composite
  FKs from Applications. Cross-Organisation association fails even for Owners.
- Unique `(candidate_id,job_id)` prevents concurrent duplicate Applications.
- Restrict deletes/relationship updates; no cascading recruitment deletion.
- Indexes support Organisation/date pagination, Organisation/Job,
  Organisation/Candidate and Organisation/stage lookups. Candidate-name
  substring matching uses `ILIKE` on the tenant-scoped join. No extension or
  trigram index is introduced for the small challenge dataset.

## RLS and grants

All three tables enable RLS. Each has SELECT and INSERT policies. Applications
also have an UPDATE policy (seven total). Every policy permits only:

1. trusted profile role `platform_owner`; or
2. the trusted Customer's Organisation; or
3. an existing delegated Admin assignment.

Policies reuse the existing private identity helpers; no new SECURITY DEFINER
functions or privileged application client. INSERT uses WITH CHECK; UPDATE
has both USING and WITH CHECK. Revocation is effective on the next database
statement/snapshot. An already completed read is not remotely erased from a
browser; subsequent reads/mutations must reauthorize.

All default table privileges are revoked from PUBLIC, anon, authenticated and
service_role before narrow authenticated grants:

- SELECT on all three tables.
- Jobs INSERT: organisation_id, title, description.
- Candidates INSERT: organisation_id, full_name, email, phone, linkedin_url.
- Applications INSERT: organisation_id, candidate_id, job_id.
- Applications UPDATE: stage only.

No DELETE/TRUNCATE/REFERENCES/TRIGGER grants. No Job/Candidate UPDATE grant.
No insertable ID/timestamp/stage and no editable relationship/tenant column.
Anon and service_role receive no table/column access. Foundation ACLs are
unchanged. Direct authenticated Data API requests are intentionally supported
only within these column grants, database constraints and independent RLS.

## Server API for UI implementation

All imports below are under `application/lib`. Use server actions from client
forms and loaders from Server Components/server code. No new HTTP routes.

`recruitment/actions.ts` exports:

| Action | Input |
| --- | --- |
| `createJob` | `{ organisationId?, title, description? }` |
| `createCandidate` | `{ organisationId?, fullName, email?, phone?, linkedinUrl? }` |
| `createApplication` | `{ organisationId?, candidateId, jobId }` |
| `updateApplicationStage` | `{ organisationId?, applicationId, stage }` |

Every mutation accepts unknown input and validates a strict Zod object. Return:
`{ ok: true, id: string }` or `{ ok: false, error: string }`.
Authorization can redirect anonymous users or produce Next.js notFound; these
framework signals are deliberately not swallowed by mutation error handling.
Provider/transport errors return safe messages, with no raw SQL/provider detail.
An uncertain write says to refresh/check before retrying; actions never retry.
Application duplicate errors have a specific safe message.

All mutations require the incoming Origin to match server `APP_URL`. They use
only the actor's normal Supabase client. `recruitmentContext()` derives Customer
Organisation from the trusted profile, rejects a conflicting supplied ID and
reuses `requireOrganisationAccess()` to recheck it. Admin/Owner callers must
supply an explicit Organisation UUID. RLS checks again during the actual write.

`recruitment/queries.ts` exports server-only:

- `listJobs({ organisationId?, offset?, limit? } = {})`
- `listCandidates({ organisationId?, offset?, limit? } = {})`
- `listPipeline({ organisationId?, offset?, limit?, jobId?, candidateName?, stage? } = {})`

Return typed arrays of rows. Pipeline rows contain Application fields plus
`candidate: { id, full_name }` and `job: { id, title }`. Embedded relationships
use inner joins, so Candidate filtering restricts Applications themselves.
Each loader verifies context and explicitly scopes Organisation under RLS.
Errors are safe exceptions suitable for an error boundary. No shared cache.

Pagination is offset-based: default 50, maximum 100 per page, maximum offset
100,000. Stable order is creation time descending then UUID ascending. Request
the next page when a full page is returned; no totals are included. UI should
reset offset when filters change and refetch after success (e.g. router.refresh).
Loader results contain Candidate contact data; do not log or publicly cache them.

New Applications always begin at `applied`. Stage values:
`applied | screening | interview | offer | hired | rejected`.
Stage changes are unrestricted among these values, independent for each Job.
Concurrent stage changes use normal last-write-wins semantics; no stage history,
optimistic-lock version or transition workflow is added. Candidate creation and
association are separate operations: a failed association leaves the Candidate
available for retry/another Job. UI should keep the returned Candidate UUID.

## Validation choices to review

- Blank optional text is normalized to NULL; names/titles are trimmed.
- Candidate email is optional and not unique (no automatic deduplication).
- Phone is optional bounded text, without country-specific formatting rules.
- LinkedIn allows HTTPS `linkedin.com/in/<profile>` or
  `www.linkedin.com/in/<profile>` with optional trailing slash, no credentials,
  query parameters, fragments, custom port or company URLs. No URL fetching.
- Candidate-name filter is a case-insensitive literal substring; `%`, `_` and
  backslash are escaped before ILIKE. Job/name/stage filters combine with AND.
- No fuzzy/full-text search, total counts, bulk APIs or lifecycle workflows.

These are bounded MVP defaults, not broader product commitments. They should
be reviewed before migration execution/UI integration.

## Automated verification and remaining gate

Offline tests cover validation, role/context derivation via the actual existing
Organisation guard, unauthorized input/origins, write payloads, duplicate/FK
error handling, stage-only updates, literal combined query filters and
pagination. SDK boundaries are mocked; these tests do not prove live RLS.

`supabase/tests/recruitment_core.sql` is an unexecuted rollback-only acceptance
suite for managed PostgreSQL. It requires five separately approved confirmed
Auth users with no profiles: owner_id, admin_id, customer_a_id, customer_b_id,
unused_id. It never inserts/updates auth.users. Fixture application rows and
profiles are created in a transaction and rolled back; before/after counts are
checked. Auth identities must be created/removed through trusted administration
only after separate execution approval.

Cases: Customer A/B reads and writes; Owner contexts; assigned/revoked Admin;
Job/Candidate/Application creation; initial stage and read-back persistence;
independent stages for multiple Jobs; duplicate and composite FK failures;
LinkedIn/name checks; combined Job/name search; forged metadata; missing
profile/subject; direct mutation/column restrictions; anon/service_role ACLs.
JWT tests explicitly set individual sub/role and combined claims; no-subject
clears the individual sub setting. No Supabase/local database was started.

Live migration/RLS/SQL acceptance and PostgREST integration remain pending
review and execution approval. No claim of live database verification is made.

## Local verification results

- Lint: passed, zero warnings.
- Typecheck: passed.
- Complete offline suite: 43 passed, zero failures/skips (11 new recruitment tests).
  Existing Node module-type detection warning remains non-blocking.
- Production Docker build: passed, including fresh Next.js compilation and
  TypeScript checking. Image `work-track:recruitment-core-review`,
  `sha256:a91658ea2a7a6f46488a3b3d80081a6ed632ee5785262daaabcf6ef00920ff0a`.
- `git diff --check`: passed.
- Both applied migration hashes remain unchanged.
- New migration SHA-256:
  `3098329d632bcf5e72a02a01ee942b2680c6d3ef46ebe027fc13847b6ae2f035`.
- SQL acceptance suite: written, not executed; database/PostgREST behaviours
  remain an explicit verification gate after migration review.

## Exact changed files

Modified: `application/lib/supabase/database.types.ts`.

Created:

- `application/lib/validation/recruitment.ts`
- `application/lib/recruitment/context.ts`
- `application/lib/recruitment/actions.ts`
- `application/lib/recruitment/queries.ts`
- `application/tests/recruitment-context.test.mjs`
- `application/tests/recruitment.test.mjs`
- `supabase/migrations/20260922000100_recruitment_core.sql`
- `supabase/tests/recruitment_core.sql`
- `docs/09-recruitment-core-backend.md`
