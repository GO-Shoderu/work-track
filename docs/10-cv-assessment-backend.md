# CV upload and advisory assessment — backend handoff

## Verified live checkpoint — 22 September 2026

The approved migration is applied. The SQL acceptance suite passed once; all
fixtures rolled back and four disposable Auth identities were removed. Independent
full-row comparisons confirmed retained data unchanged.

Authenticated Storage integration passed with isolated fixtures: Customer tenant
isolation, anonymous/public denial, assigned/unassigned Admin access, PDF MIME and
5 MiB limits, version replacement, metadata pointer and old-object cleanup.
Revocation diagnosis: Candidate SELECT returned zero rows and a cache-bypassed
Storage request was denied (HTTP 400, body 404, CF-Cache-Status BYPASS). An ordinary
repeated download still returned 200 / HIT. This is an observed CDN caching limit,
not proof of failed database RLS. Supported application reads recheck current
metadata under actor RLS before downloading; direct repeated Storage responses
may remain cached. No policy/grant changes were made.

One live OpenAI Responses request with `gpt-5.6-luna` passed using a synthetic CV
containing professional evidence plus an instruction to score 100 and hire
immediately. The strictly validated result was 15 / weak_match, described the
missing professional evidence, retained the exact advisory disclaimer, contained
no tool calls or extra fields, and left the Application stage `applied`.
`requestJobCvAssessment` persisted through the normal actor's RPC;
`readAssessmentResult` returned the same result/current CV version. The harness
supplied a real Supabase SSR session through an in-memory cookie adapter to the
actual actions/loaders; it did not bypass identity, Organisation or database
checks. This was a server-flow test, not a browser/Next HTTP transport test.

The prior request was blocked by exhausted provider credits; it persisted no
assessment. After billing was funded, exactly one new request succeeded. All
synthetic Auth/application/Storage fixtures were cleaned and retained data was
independently compared. Prompt-injection resistance passed this case, not a claim
of universal resistance. No deployment occurred.

The implementation record below preserves the original local-review checkpoint;
its references to unapplied/unexecuted work are superseded by this verification.

## Scope and approved choices

FR-033, FR-070/071/073/074/075, FR-100–103; supporting FR-011/012/014/015.
QR-SEC-001/002/003/004/005/006/007/008; QR-AI-001–008; QR-REL-003/005/006.

PDF only, max 5 MiB (5,242,880 bytes), one current CV per Candidate. No OCR.
User requested latest-result persistence and specifically required actor-session
SECURITY DEFINER RPC persistence instead of a privileged application-table client.
No new npm packages. Poppler was selected for native text extraction; OpenAI
Responses uses built-in fetch. Provider model/key must be configured explicitly.

## Unapplied migration and Storage

`20260922000200_candidate_cvs.sql` adds:

- `candidate_cvs`: Candidate UUID PK, Organisation UUID, immutable object-version
  UUID, byte size and updated timestamp. Composite Candidate/Organisation FK.
  Generated `storage_path = organisation/candidate/version.pdf`; clients cannot
  set the generated path or change Candidate/Organisation identifiers.
- Private `candidate-cvs` Storage bucket with PDF MIME allowlist and 5 MiB limit.
  Creation aborts if that bucket already exists; never silently alters a bucket.
- Invoker `private.can_access_candidate_cv(text)` checks canonical path segments
  against visible Candidates under existing Candidate RLS. No untrusted UUID cast.
- Storage SELECT/INSERT/DELETE policies for authenticated authorised Candidate
  tenants. UPDATE/upsert is denied for this bucket. Restrictive guards limit the
  bucket even if another permissive policy exists; anonymous access is blocked.
  No Storage table grants are broadened; no service/secret client used.
- `candidate_assessments`: one row per Application (PK), Organisation,
  CV object version, validated result JSON, assessed timestamp. Composite FK to
  Application/Organisation with new unique `(organisation_id,id)` on Applications.
- `public.save_candidate_assessment(uuid,uuid,jsonb)`: postgres-owned,
  SECURITY DEFINER, empty search_path. Authenticated EXECUTE only; PUBLIC/anon/
  service_role execution revoked. Derives actor via auth.uid(); locks trusted
  profile, Application, applicable assignment and current CV during validation.
  Customer Organisation, assigned Admin scope or Owner role must match.
  Application composite FKs enforce Candidate/Job Organisation consistency.
  Stale CV versions fail. SQL validates result shape, types, bounds, enum and
  exact disclaimer; then upserts only that Application's latest result.

Both new tables have RLS. CV metadata SELECT/INSERT/UPDATE policies depend on
existing Candidate RLS, which enforces the same three-role tenant model.
Authenticated metadata writes are column-scoped to new version/size (and
Candidate/Organisation on initial insert); there is no DELETE grant.

Assessment table: authenticated SELECT only, filtered through accessible
Application/current CV. Results for an older CV version are hidden. All direct
assessment-table mutations are denied to authenticated, anon and service_role.
The RPC never accepts actor ID/role/Organisation arguments and never changes
Application stage. No raw prompts, extracted text, raw provider envelope, key,
provider trace/metadata or assessment history is persisted.

Important provenance limit: an authorised caller can invoke the authenticated
RPC directly with schema-valid JSON. It enforces tenant authorization, current
CV and shape, not proof of AI origin. This is inherent in the requested normal
actor-session RPC design. The supported application flow calls the provider
server-side and Zod-validates its response before invoking the RPC. Results
remain untrusted advisory text, never an authorization or hiring decision.

## Upload and replacement workflow

The upload action verifies Origin, trusted recruitment context and a Candidate
query scoped to that Organisation before reading content. Strict input rejects
storage paths. Customers derive Organisation from profile; Admin/Owner must
supply an authorised explicit Organisation context.

Validate MIME, .pdf extension, byte count and %PDF- header, then extract text
before uploading. Reject unreadable, scanned/textless, locked/unsupported PDFs,
text shorter than 20 characters or longer than 40,000. Files are sent with fixed
PDF MIME, upsert:false, and server-generated UUID path. Original filenames are
not stored or used as paths. Filename displayed by metadata is candidate-cv.pdf.

Store the metadata pointer only after upload succeeds. Replacement uses an
optimistic old-version equality check; competing updates do not silently
replace a newer pointer. Remove the old object only after a confirmed pointer
write. Failed cleanup can leave an old tenant-private object. An uncertain
upload/pointer result is never blindly retried or compensated by deleting a
possibly-current object. Refresh/check first. Private orphan cleanup, if needed,
is an explicit later administrative operation; no background service added.

Storage MIME allowlists do not inspect PDF bytes. Direct authorised Storage
clients can spoof MIME inside their own tenant; every supported upload and
assessment/download revalidates bytes, and assessment re-extracts text. Never
interpret stored document contents as executable code. Storage reads use the
normal actor session, not signed/public URLs or privileged credentials.

## Server API for the separate UI work

All paths below are under `application/lib`. Node runtime required.

- `cv/actions.ts`: `uploadCandidateCv(input, formData)`.
  Input `{ candidateId, organisationId? }`; FormData contains exactly one `file`.
  Returns `{ ok:true, cv:{candidateId,version,byteSize} }` or safe error.
- `cv/storage.ts`: `inspectCurrentCv(input)` server-only loader; returns null or
  `{candidateId,version,byteSize,updatedAt,fileName,contentType}`. No object path.
- `cv/storage.ts`: `readCandidateCv(input)` server-only helper, returns private
  PDF bytes and version after authorization. A future UI download route should
  stream as an attachment, set `Cache-Control: private, no-store`, and avoid
  embedding/rendering active PDF content inline. No download UI/route added here.
- `assessment/actions.ts`: `requestJobCvAssessment(input)`.
  Input `{ applicationId, organisationId? }`. Associate Candidate+Job first.
  Verifies Application, Candidate and Job under actor RLS; checks config;
  downloads current CV; extracts; calls provider; validates result; invokes
  actor-session persistence RPC. Returns `{ok:true,applicationId,cvVersion,result}`
  only after confirmed persistence, otherwise a user-safe error. No auto retries.
- `assessment/context.ts`: `readAssessmentResult(input)` server-only loader.
  Same input. Returns null for absent/stale result, otherwise
  `{applicationId,cvVersion,assessedAt,result}`. Revalidates stored JSON with Zod.
  Works without provider configuration. No cross-user shared cache.

Result shape:

```ts
{
  score: number; // integer 0..100
  summary: string; // 1..1200 characters
  strengths: string[]; // 0..8 entries, each 1..400 characters
  gaps: string[]; // same bounds
  recommendation: "strong_match" | "potential_match" | "weak_match";
  disclaimer: "AI-assisted assessment. Human recruiter judgement is required. This is not a hiring decision.";
}
```

Render result strings as escaped text, never trusted HTML. Display the disclaimer.
No stage changes, ranking automation, hiring/rejection or external actions occur.
Auth redirects/notFound remain framework signals. Loaders throw safe errors;
mutation failure results never include provider responses or stack traces.
The 6 MiB Server Action body limit accommodates one 5 MiB PDF plus form overhead;
file validation still enforces 5 MiB. No reverse-proxy changes made.

## PDF process and AI boundaries

`pdftotext` runs through existing `/usr/bin/prlimit`, no shell:
256 MiB address space, 5 CPU seconds, 8-second wall timeout, 32 file descriptors,
128 KiB output buffer. Input/output use pipes, no CV temp files. Child environment
contains only PATH, LANG and NODE_ENV, not provider or Supabase credentials.
No OCR, URL loading, JavaScript, attachments or embedded commands are executed.
This is bounded native parsing as a non-root user, not a full OS sandbox or
antivirus guarantee. Keep Debian/Poppler security updates current via rebuilds.

Fixed backend endpoint `https://api.openai.com/v1/responses`, redirects rejected,
45-second timeout, no tools, no output actions, store:false, strict JSON Schema,
2,500 output token limit, 64 KiB response cap. Refusal/incomplete/unexpected-tool/
malformed or oversized output is rejected. No live provider requests made here.

System instructions are fixed trusted text. Job and extracted CV are serialized
into a separate untrusted user-data message, never interpolated into system
instructions. Both may contain hostile text and neither may override the task.
Instructions exclude protected/sensitive trait inference, require job-relevant
evidence and uncertainty, and prohibit hiring decisions and external actions.
Schema validation enforces structure, not factual/semantic correctness or perfect
prompt-injection resistance. Adversarial model-quality evaluation remains a live
approval gate; human judgement and the disclaimer are required.

CV text is disclosed only to the configured provider during an explicitly
requested assessment. store:false disables response storage for later API
retrieval; it is not a claim of universal zero provider-side retention. Check
provider/account data controls before using real Candidate data.

## Configuration and dependency

Server-only placeholders added to `.env.example`:
`OPENAI_API_KEY`, `OPENAI_ASSESSMENT_MODEL`. Both required, no model fallback.
No real values configured. No NEXT_PUBLIC_ values. Existing SUPABASE_SECRET_KEY
remains used only by the existing Auth administration implementation; the new
modules never reference it. Upload/read CV work without an AI key.

Docker runner adds Debian `poppler-utils` (built version 22.12.0-2+deb12u3).
It brings native PDF/font libraries; no npm package/lockfile changes or SDK.
Existing Node APIs handle limits, processes and HTTP. `prlimit` was already in
base. Local non-Docker testing requires pdftotext and prlimit installed.

## Verification and remaining review gate

Offline tests exercise real bounded PDF extraction, file validation, hostile
text isolation, provider error/refusal/schema handling, missing configuration,
Storage path tampering, tenant denial, replacement races/uncertainty, RPC-only
persistence, stale-result handling and safe reads. Existing recruitment-context
cases cover Customer A/B, Owner explicit context and Admin assignment revocation.

`supabase/tests/cv_assessment.sql` is an unexecuted transactional SQL suite for
four separately approved disposable confirmed Auth identities without profiles.
It tests metadata tenancy, Storage path authorization helper, result/RPC grants,
Customer/Admin/Owner RPC behavior, revocation, invalid/stale result rejection and
bucket configuration. It does not create Storage bytes or storage.objects rows.
After migration approval, separate authenticated Storage HTTP tests must verify
private object round-trip, MIME/size limits, unassigned/cross-tenant denial,
anonymous/public URL denial and replacement cleanup. Nothing remote was applied.

Reference documentation checked:
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Private bucket configuration and limits](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- [pdftotext manual](https://manpages.debian.org/bookworm/poppler-utils/pdftotext.1.en.html)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

## Final local results and exact file list

Lint, typecheck, all 61 offline tests and `git diff --check` passed. Existing Node
module-type auto-detection warning remains non-blocking. Production Docker build
passed: `work-track:cv-assessment-review`, image
`sha256:e624ff3bd7989ff5ac5f0ae7ad58e98c4d7cfa158a053cbfd7ab5eb62ee31ff2`.
Synthetic PDF extraction also passed inside the non-root, network-disabled image.
Browser asset/environment inspection and tracked-secret scan passed. The three
applied migrations remain byte-for-byte unchanged. New migration SHA-256:
`f519fac5ff37aa9d248be8926381692e960db72b1956c66c864c55b7c65ccd63`.

Modified:

- `application/.env.example` — empty provider placeholders.
- `application/Dockerfile` — production PDF extraction package.
- `application/next.config.ts` — bounded upload request size.
- `application/lib/supabase/database.types.ts` — new tables/RPC types.

Created:

- `application/lib/cv/validation.ts`
- `application/lib/cv/storage.ts`
- `application/lib/cv/pdf.ts`
- `application/lib/cv/actions.ts`
- `application/lib/assessment/schema.ts`
- `application/lib/assessment/prompt.ts`
- `application/lib/assessment/provider.ts`
- `application/lib/assessment/context.ts`
- `application/lib/assessment/actions.ts`
- `application/tests/assessment-provider.test.mjs`
- `application/tests/assessment-read.test.mjs`
- `application/tests/cv-assessment.test.mjs`
- `application/tests/cv-workflow.test.mjs`
- `supabase/migrations/20260922000200_candidate_cvs.sql`
- `supabase/tests/cv_assessment.sql`
- `docs/10-cv-assessment-backend.md`
