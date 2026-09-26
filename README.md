# Work Track

Work Track is a lightweight, security-first, multi-tenant Applicant Tracking System (ATS) built for the Devotion Ventures coding challenge and extended into a usable end-to-end recruitment workflow.

**Live deployment:** https://worktrack.go-sh.dev

> **Current delivery status:** the latest public-recruitment release is deployed to production. Work Track now supports authenticated recruiter workflows, public careers and Job pages, public Applications with CV upload, recruiter-facing applicant review, private CV viewing, AI-assisted CV assessment, Job lifecycle management, and the original multi-tenant recruitment pipeline.

## Why the scope was extended

The original challenge requirements were implemented first: account provisioning, Customer login, Job creation, Candidate management, Applications, filtering, and a Kanban-style recruitment pipeline.

During final product review, it became clear that the system still behaved more like an internal tracking demo than a complete recruitment workflow. A real Customer could manage Candidates already known to them, but there was no strong public path for a Job seeker to discover a role, apply, submit a CV, and then appear naturally inside the recruiter's workflow.

The public-recruitment release closes that gap while preserving the original tenant and security model.

## What Work Track does

A Customer can:

1. sign in to their Organisation workspace;
2. create and manage Jobs through draft, published, closed, and archived states;
3. publish Jobs to an Organisation-specific public careers page;
4. open or share a stable public Job URL;
5. receive public Applications with Candidate contact information and a required PDF CV;
6. add Candidates manually, with an optional profile CV;
7. review applicants per Job;
8. securely view Application CVs and Candidate profile CVs;
9. run or review advisory AI-assisted Job-fit assessments;
10. associate Candidates with Jobs through Applications;
11. move Applications through the recruitment pipeline;
12. filter and manage the recruitment pipeline by Job and Candidate.

The default pipeline stages are:

```text
Applied → Screening → Interview → Offer → Hired
                                      ↘ Rejected
```

A Platform Owner can provision and support Customer Organisations, while a delegated Admin can operate only within Organisations explicitly assigned to them.

## Roles and tenant model

Work Track has three authenticated roles:

| Role | Scope |
| --- | --- |
| `platform_owner` | Platform-wide administration and explicit access to Customer workspaces |
| `admin` | Only Organisations currently assigned to that Admin |
| `customer` | Exactly one Customer Organisation |

Candidates are **domain entities**, not authenticated users.

The core recruitment relationship is:

```text
Candidate + Job = Application
```

The Application owns the recruitment stage, so one Candidate may be considered for multiple Jobs independently.

## Current implemented scope

### Identity and administration

- Supabase email/password authentication
- manually bootstrapped first Platform Owner
- Platform Owner account provisioning
- Customer Organisation provisioning
- delegated Admin provisioning
- Admin-to-Organisation assignment and immediate revocation
- explicit Organisation context for Admin/Owner operations
- one-time temporary credentials for newly provisioned accounts
- no public signup for recruiter accounts

### Recruitment core

- Organisation-owned Jobs
- Organisation-owned Candidates
- optional Candidate email, phone and LinkedIn profile
- Candidate-to-Job Applications
- duplicate Candidate+Job prevention
- six recruitment stages
- stage persistence
- Kanban-style pipeline
- Job filtering
- Candidate-name filtering
- dedicated Overview, Pipeline, Jobs and Candidates workspace views

### Job lifecycle and public recruitment

- Job lifecycle: `draft`, `published`, `closed`, `archived`
- stable public Job identifier
- Organisation-specific careers slug
- public careers page:
  - `/careers/<organisation-slug>`
- public Job page:
  - `/careers/<organisation-slug>/jobs/<public-id>`
- public Application page:
  - `/careers/<organisation-slug>/jobs/<public-id>/apply`
- public Job sharing from the recruiter workspace
- rich-text Job description editing
- closing date support
- closed Jobs stop accepting new public Applications
- archived Jobs remain read-only

### Public Applications and CV handling

- public Candidate submission with full name, email, optional phone, optional LinkedIn URL, and required PDF CV
- PDF validation and size limits
- private Supabase Storage for CVs
- Application-specific immutable CVs for public submissions
- Candidate profile CVs for recruiter-managed/manual Candidates
- Candidate reuse by normalized email within the same Organisation
- public submission does not overwrite an existing Candidate's canonical profile CV
- recruiter-only CV endpoints for both Application CVs and Candidate profile CVs
- private, no-store PDF responses with tenant authorization rechecked before access

### Recruiter applicant workflow

- Job-specific Applicants view
- applicant count per Job
- compact applicant cards
- applicant stage, source, assessment state, and applied date
- secure View CV action
- Candidate detail navigation
- compact Candidates directory
- detailed Candidate view separated from the directory
- full assessment detail shown only when a Candidate is opened
- optional CV upload during manual Candidate creation

### AI-assisted assessment

- server-side CV text extraction
- advisory AI Job-fit assessment
- structured result containing score, summary, strengths, gaps, and recommendation
- Application assessment status tracking
- source-aware assessment:
  - public Application → immutable Application CV
  - manual Application → current Candidate profile CV
- Job content version included in assessment validity
- stale assessment detection when Job content changes
- AI assessment does **not** autonomously hire, reject, advance, or move a Candidate between stages
- public Application submission succeeds independently of AI completion

## Security controls

- Supabase Row Level Security on tenant-owned data
- Customer A/B tenant isolation
- delegated Admin assignment checks
- explicit Organisation context for Admin/Platform Owner operations
- composite database constraints preventing cross-tenant Candidate/Job Applications
- server-side Origin checks for state-changing actions
- strict validation at trusted boundaries
- least-privilege table grants
- narrow privileged RPCs where cross-table mutations require controlled execution
- no browser exposure of Supabase privileged credentials
- private CV Storage
- no public CV URLs
- authenticated CV access revalidates Organisation access
- secrets excluded from Git and Docker build context
- non-root production container

See [`docs/06-security.md`](docs/06-security.md) for the threat model and security design.

## Architecture

```text
Public Applicant / Recruiter Browser
  │
  ▼
Next.js 16 / React 19 / TypeScript
  │
  ├── Supabase Auth
  ├── Supabase PostgreSQL + RLS
  ├── Supabase Storage (private CVs)
  └── OpenAI-compatible server-side assessment provider

Production
  │
  ▼
Hostinger VPS
  │
  ▼
Nginx Proxy Manager
  │
  ▼
Docker
  │
  ▼
Work Track Next.js application
```

The production application lives in `application/`. Material under `reference/` is design/interaction reference material only.

## Key design assumptions

- An Organisation is the Customer tenant boundary.
- A Customer belongs to one Organisation.
- A delegated Admin may operate only within Organisations explicitly assigned to them.
- A Platform Owner can operate across Organisations using explicit Organisation context.
- Admins do not impersonate Customer credentials.
- A Candidate is not an authenticated Work Track user.
- An Application represents one Candidate being considered for one Job.
- Application stage changes are human-driven and persisted.
- Candidate email is optional for manually created Candidates.
- Public Application Candidate reuse is scoped to the same Organisation.
- Public Application CVs belong to the Application and are immutable after submission.
- Candidate profile CVs and Application CVs are intentionally distinct.
- The MVP intentionally omits destructive Candidate deletion.
- AI assessment is advisory decision-support and must not autonomously hire, reject, or advance Candidates.

## Local development

Requirements:

- Node.js 24
- npm
- Docker
- Supabase CLI
- access to the configured Supabase project, or local Supabase for isolated development
- Poppler utilities available in the runtime for PDF text extraction

```bash
cd application
npm ci
npm run dev
```

The application uses these environment-variable names:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
APP_URL
OPENAI_API_KEY
OPENAI_ASSESSMENT_MODEL
```

Never commit `.env`, `.env.local`, `.env.production`, API keys, passwords or temporary account credentials.

Without valid runtime configuration, protected functionality fails closed.

## Database migrations

Migrations are versioned under `supabase/migrations/`.

Current production migration history includes:

```text
20260921000100_identity_foundation.sql
20260921000200_account_provisioning.sql
20260922000100_recruitment_core.sql
20260922000200_candidate_cvs.sql
20260926000100_public_recruitment.sql
20260926000200_authenticated_job_management.sql
20260926000300_public_applications.sql
```

These migrations cover identity, provisioning, recruitment core, private Candidate CVs, public recruitment, authenticated Job lifecycle management, public Application submission, Application CV ownership, assessment state, public discovery, and the supporting tenant/security contracts.

## Verification

From `application/`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Latest verified result:

```text
Lint:         passed
Typecheck:    passed
Tests:        118 passed, 0 failed
Build:        passed
Docker build: passed
```

The test suite covers identity/profile validation, role enforcement, Customer tenant isolation, delegated Admin assignment and revocation, provisioning failure handling, recruitment validation, cross-tenant relationship rejection, Job lifecycle transitions, concurrent Job edit safety, public Job discovery, public Application submission, Candidate reuse rules, immutable public Application CV behavior, Candidate profile CV access, recruiter applicant visibility, source-aware AI assessment, CV access authorization, and migration security contracts.

Local end-to-end acceptance testing also covered the public Applicant flow, recruiter Applicants view, Candidate detail flow, CV viewing, manual Candidate CV upload, Job sharing, and Job lifecycle actions before production deployment.

## Deployment

The live environment is:

```text
https://worktrack.go-sh.dev
```

Production runs in Docker on a Hostinger VPS behind Nginx Proxy Manager and HTTPS.

The application container:

- uses a multi-stage Docker build;
- runs as a non-root user;
- is reachable only through the existing reverse-proxy Docker network;
- keeps production secrets outside the repository and image;
- includes Poppler utilities for CV extraction;
- exposes `/api/health` for application liveness.

Production deployment verification included:

- successful Supabase migration synchronization
- successful production Docker rebuild
- healthy running container
- successful internal `/api/health`
- successful public `https://worktrack.go-sh.dev/api/health`
- production code running the expected Git commit

`/api/health` intentionally reports application liveness only and does not expose database, authentication-provider or AI-provider details.

## Project documentation

Key design and implementation documents live under `docs/`, including:

- [`01-product-vision.md`](docs/01-product-vision.md)
- [`05-architecture.md`](docs/05-architecture.md)
- [`06-security.md`](docs/06-security.md)
- [`07-identity-foundation.md`](docs/07-identity-foundation.md)
- [`08-account-provisioning.md`](docs/08-account-provisioning.md)
- [`09-recruitment-core-backend.md`](docs/09-recruitment-core-backend.md)
- [`10-cv-assessment-backend.md`](docs/10-cv-assessment-backend.md)
- [`11-public-recruitment-foundation.md`](docs/11-public-recruitment-foundation.md)
- [`12-authenticated-job-management.md`](docs/12-authenticated-job-management.md)
- [`13-public-applications.md`](docs/13-public-applications.md)
- [`14-recruiter-application-visibility.md`](docs/14-recruiter-application-visibility.md)

## AI-assisted development

AI tools were used deliberately during implementation for code generation, review, testing support and iteration. Security-sensitive code was still reviewed against the documented trust boundaries, authorization model, RLS policies and database constraints.

The guiding implementation rule is:

> A feature is not complete if it only works when security controls are weakened.

## Intentional follow-up work

The following items are intentionally outside this release and are better treated as subsequent product iterations rather than blockers for the current recruitment workflow:

- public Request Access workflow for prospective Customer Organisations
- richer notification/inbox workflows
- expanded audit-log UI
- inactive/disabled Organisation lifecycle controls
- idle-session/logout policy refinements
- richer analytics and reporting
- further Applicant/Candidate search, pagination, and bulk actions
- optional AI-generated Job teaser/content assistance
- additional operational monitoring and deployment automation

## Final delivery

The current delivery includes:

- this GitHub repository;
- the live Work Track deployment;
- Platform Owner/Admin and regular Customer demo credentials shared privately;
- the original walkthrough material;
- documented architecture, security model, backend design, public recruitment flow, and intentional MVP trade-offs.

The current public-recruitment release is a deliberate extension beyond the minimum challenge requirements so that Work Track behaves as a complete recruitment workflow rather than only an internal tracking interface.
