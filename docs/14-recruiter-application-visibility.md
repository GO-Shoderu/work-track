# Recruiter Application visibility

Focused integration after Phase 2B, covering FR-040–045 and FR-100–103. No migration, database changes, new dependencies, UI redesign or assessment/stage algorithm changes.

## Job applicants

Server-only `listJobApplications({ organisationId?, jobId, offset?, limit? })` lives in `application/lib/recruitment/job-applications.ts`.

The loader derives Customer context from the authenticated profile, rechecks delegated Admin assignment, and requires explicit Organisation context for Admin/Owner. Every query also uses the authenticated Supabase client with tenant-scoped filters and RLS. Unknown or foreign Jobs return an empty list within the authorised context; an unauthorised Organisation context is denied before recruitment reads.

Each result contains exactly:

- `id`, `candidate_id`, `job_id`
- `stage`, `source`, `assessment_status`, `created_at`
- `candidate: { full_name, email }` — the canonical talent-pool identity
- `submitted_full_name`, `submitted_email`, `submitted_phone`, `submitted_linkedin_url` — the immutable public Application snapshot, or null for manual Applications
- `cv_available`

For public Applications, the recruiter UI should display the `submitted_*` values as the applicant contact information; `candidate` remains explicitly canonical and is never overwritten. The submitted email comes from the snapshot's normalized email. No Candidate phone/LinkedIn, Organisation details, Storage paths, object identifiers or credentials are returned.

Pagination follows existing patterns: newest creation time then ID, offset default 0, limit default 50/max 100. Removed Applications are excluded, matching the active pipeline. CV/snapshot lookups are batched and bounded to IDs on the returned page, never per-row downloads. `cv_available` indicates an appropriate metadata association: an Application CV for public Applications, or a current Candidate CV for manual Applications. A later download may still fail if the private object is missing or inaccessible; the PDF route rechecks authorization and validates downloaded bytes.

`listPipeline` additionally selects `source` and `assessment_status`. Existing tenant, Job, stage, name, removed-at and pagination filters remain unchanged.

## Authenticated CV route

`GET /api/recruitment/applications/<applicationId>/cv?organisationId=<uuid>`

`organisationId` is optional for Customers and required for delegated Admin/Platform Owner. Customer-supplied context must match their trusted tenant. Unknown/repeated query keys and invalid IDs fail safely.

The route calls `readApplicationCv`, which reuses `assessmentContext` and `recruitmentContext`. Public Applications download their immutable Application-specific CV; manual Applications download the Candidate's current CV. Public Applications never fall back to a shared Candidate CV. Existing path validation, PDF magic/size validation and metadata byte-size checks apply. The read uses the normal authenticated client, never service-role access.

A successful response returns PDF bytes with:

- `Content-Type: application/pdf`
- `Cache-Control: private, no-store`
- `X-Content-Type-Options: nosniff`
- `Content-Disposition: inline; filename="application-<validated UUID>-cv.pdf"`

No Storage path, public/signed URL or privileged credential reaches the caller. Anonymous, denied, missing, malformed or unavailable reads return the same `404` / `CV not found.` response with private/no-store and nosniff headers. Identity redirects are intentionally converted to an API 404. The route is dynamic and uses the Node runtime.

The existing assessment action still downloads the Application CV for public Applications and the current Candidate CV for manual Applications. Server-only `hasApplicationCv({ organisationId?, applicationId })` authorizes through the same context and returns source-aware metadata availability. The existing Candidate assessment buttons now use that per-Application value instead of the shared Candidate CV. Their unavailable-CV message also follows the source; layout/styling is unchanged. Reading never changes stage or assessment status.

## Verification

111 offline tests pass, including 13 focused recruiter-visibility tests exercising the actual context/authorization and CV helper chain with mocked database/Storage boundaries. These cover tenant and Job isolation, current/revoked Admin assignments, explicit Owner context, snapshots, pagination, source-aware CV availability, both PDF sources, missing/invalid files, safe response headers and read-only behavior.

No database changes or live Supabase calls are needed for this integration. Lint, typecheck, Docker build (`work-track:recruiter-visibility-review`) and `git diff --check` passed.

## Files changed

- `application/app/api/recruitment/applications/[applicationId]/cv/route.ts`
- `application/components/recruitment/candidate-cv-assessment.tsx`
- `application/components/recruitment/recruitment-workspace.tsx`
- `application/lib/assessment/context.ts`
- `application/lib/recruitment/job-applications.ts`
- `application/lib/recruitment/queries.ts`
- `application/lib/validation/recruitment.ts`
- `application/tests/assessment-read.test.mjs`
- `application/tests/recruiter-visibility.test.mjs`
- `docs/14-recruiter-application-visibility.md`

No commits, pushes or deployment are included in this checkpoint. The pre-existing untracked `supabase/snippets/` directory remains untouched.
