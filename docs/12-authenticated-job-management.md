# Authenticated Organisation Job management — Phase 2A

Review checkpoint only. New migration:
`20260926000200_authenticated_job_management.sql` (not applied remotely).
FR-020/021/022/025/090; QR-SEC-001/002/003/006/007. No dependencies added.
No public applicant flow, anonymous CV access, UI changes or deployment.

## Server contracts

Exports in `application/lib/recruitment/actions.ts`:

- `createJobDraft({ organisationId?, title, descriptionRich, closesAt? })` creates
  an internal draft. A title is required; an empty paragraph is a valid draft.
- `saveJobDraft({ organisationId?, jobId, contentVersion, title, descriptionRich,
  closesAt? })` saves an existing draft only.
- `editJob(...)` has the same contract and edits draft/published Jobs.
- `publishJob({ organisationId?, jobId })`: draft → published.
- `closeJob({ organisationId?, jobId })`: published → closed, including expired
  published Jobs, without changing any Applications.
- `archiveJob({ organisationId?, jobId })`: draft/closed → archived. Close a
  published Job before archiving it. Archived Jobs are read-only. Reopening closed
  Jobs and unarchiving are deferred for review rather than implicit transitions.

All return the existing `{ ok: true, id } | { ok: false, error }` contract.
Authentication redirects/notFound remain framework signals. Mutations check Origin
and use the existing trusted Organisation guard. Customers derive their tenant
from their profile; Admins/Owners provide an authorised explicit context.

Omitted/null closesAt clears the deadline. Supplied dates must be valid future
ISO timestamps with a timezone; the database independently requires finite future
instants. Saving expired published content requires clearing/advancing its deadline.
Publishing requires title and plain description each to contain a letter or digit
rather than being empty, whitespace or punctuation-only. This is a deterministic
minimum, not an AI judgement of description quality. Publication validates the
latest locked row and deadline. Repeated/invalid transitions fail safely.

`contentVersion` is required for existing content saves; stale versions fail with
an actionable reload message. Lifecycle updates do not increment it. The existing
Phase 1 triggers invalidate assessments/teasers on content changes, never stages.

`listJobs()` retains tenant filtering, sorting/pagination and existing fields,
and adds status, public_id, closes_at, teaser, published_at, closed_at and
content_version. The server-only `getJobForEdit({ organisationId?, jobId })`
loader uses the same recruitment context and actor-session RLS, filters by trusted
Organisation plus Job ID, and returns only id, title, description_rich, closes_at,
status and content_version. Missing/inaccessible Job rows return null; invalid
input and database failures produce safe errors. Authentication/context denials
retain existing redirect/notFound behavior. Owner context must be explicit and
Admin assignment is rechecked on each call; there is no public/anonymous access.
The existing plain-text createJob form is supported by converting its input to a
paragraph document; it cannot supply a separate trusted derived-description field.

## Bounded Tiptap document

The Zod schema in `application/lib/validation/job-content.ts` defines a deliberate
subset of [Tiptap's node/mark schema](https://tiptap.dev/docs/editor/core-concepts/schema):

- Root doc with 1–100 blocks; paragraphs, headings (levels 2/3), bullet/ordered
  lists, list items, text and hardBreak.
- List items start with a paragraph; lists contain list items; paragraphs/headings
  contain inline nodes only. Ordered list start is optionally 1–1,000,000.
- Text marks: bold, italic, strike and code. Duplicate marks are rejected.
- No links, raw HTML nodes, media, embeds, arbitrary attrs or unknown keys. HTML
  characters in ordinary text remain untrusted text; future renderers must escape
  them and must never render this document as arbitrary HTML.
- At most 64 KiB serialized JSON, 1,000 nodes, depth 8 (root at 0), 100 children
  per node, and 20,000 derived plain-text characters. The database measures its
  canonical JSONB representation, so near-limit requests may be rejected there.
- Hard breaks and paragraph/heading endings become newlines. Text marks do not
  affect extraction. Outer ASCII whitespace is trimmed. No client-provided plain
  description is accepted by the new contracts or RPC.

## Database boundary and security

`save_job_content` validates the document again in PostgreSQL and derives the
persisted plain description from text nodes, atomically with rich content/title/
deadline. `transition_job` validates state and publication requirements under a
row lock. Both are narrow actor-session SECURITY DEFINER functions with empty
search_path, postgres ownership, authenticated-only EXECUTE and trusted profile/
assignment checks. Assignment/profile share locks protect authorization through
commit. Job row locks serialize lifecycle/content changes.

Direct authenticated Job INSERT and UPDATE grants are revoked to prevent bypass
of validation and transitions. description_rich remains unavailable to direct
writes. Job SELECT RLS and Candidate/Application/Storage rules are unchanged.
No privileged application-table client, service key, HTML parser or Tiptap runtime
is introduced. The existing UI create action uses the RPC after this migration;
coordinate a future approved application/migration rollout accordingly.

## Verification

Focused offline tests cover document shapes/bounds/extraction, dates, RPC payloads,
authorization failures, stale-save errors, strict input and expanded list fields.
`supabase/tests/authenticated_job_management.sql` provides rollback-only acceptance
for four disposable confirmed Auth identities without profiles. It covers direct
write denial, malformed document rejection at the RPC boundary, transitions,
Customer A/B isolation, assigned/revoked Admins, Owner scope, optimistic version
checks and assessment staleness with unchanged Application stages.

The Phase 1 recruitment/public-recruitment SQL scripts assert the historical
Phase 1 direct-write contract and target a Phase 1-only database. On the complete
Phase 2A schema, run the new Job-management suite and the existing CV/assessment
suite. Managed verification and migration execution are deferred until approval.

Local review results: lint, typecheck and all 80 offline tests passed (15 new
focused cases, zero failures/skips). The Job-management and CV/assessment SQL
suites passed with rollback in isolated network-disabled PostgreSQL 15 using
minimal Auth/Storage stand-ins. These results do not claim managed verification.
Docker build passed (`work-track:authenticated-job-management-review`, image
`sha256:9b0742a73c1bb6cda1957370b4a7c9fa521ef897220f903ce74a424756b088ae`).
`git diff --check` passed. Applied migrations remain unchanged. No commit or push.

Edit-loader coverage exercises the actual recruitment context/authorization code
with a mocked authenticated SDK: Customer own-tenant reads, foreign context/Job
denial, assigned/revoked Admin checks, explicit Owner contexts, anonymous denial,
strict input, safe database failures and the exact six-field projection.
