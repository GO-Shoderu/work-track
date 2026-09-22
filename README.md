# Work Track

Work Track is a lightweight, multi-tenant Applicant Tracking System (ATS) built
for the Devotion Ventures coding challenge.

**Live deployment:** https://worktrack.go-sh.dev  

> **Current delivery status:** the repository is ahead of the currently deployed
> build while final delivery work is completed. The core ATS workflow is implemented:
> authentication, tenant-aware administration, account provisioning, Jobs,
> Candidates, Applications, recruitment stages, filtering, and the Kanban-style
> recruitment pipeline. CV upload and AI-assisted assessment are the remaining
> delivery items in progress before the final production redeploy.

## What Work Track does

A Customer can:

1. sign in to their Organisation workspace;
2. create Jobs;
3. add Candidates and profile information;
4. associate Candidates with Jobs through Applications;
5. move Applications through the recruitment pipeline;
6. filter the pipeline by Job and Candidate name.

The default pipeline stages are:

```text
Applied → Screening → Interview → Offer → Hired
                                      ↘ Rejected
```

A Platform Owner can provision and support Customer Organisations, while a
delegated Admin can operate only within Organisations explicitly assigned to them.

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

The Application owns the recruitment stage, so one Candidate may be considered
for multiple Jobs independently.

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

### Security controls

- Supabase Row Level Security on tenant-owned data
- Customer A/B tenant isolation
- delegated Admin assignment checks
- composite database constraints preventing cross-tenant Candidate/Job Applications
- server-side Origin checks for state-changing actions
- strict Zod validation at trusted boundaries
- least-privilege table grants
- no public signup
- no browser exposure of Supabase privileged credentials
- secrets excluded from Git and Docker build context

See [`docs/06-security.md`](docs/06-security.md) for the threat model and security design.

## Architecture

```text
Browser
  │
  ▼
Next.js 16 / React 19 / TypeScript
  │
  ├── Supabase Auth
  ├── Supabase PostgreSQL + RLS
  ├── Supabase Storage (private CV storage in final delivery scope)
  └── AI provider (server-side assessment workflow in final delivery scope)

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

The production application lives in `application/`. Material under `reference/`
is design/interaction reference material only.

## Key design assumptions

- An Organisation is the Customer tenant boundary.
- A Customer belongs to one Organisation.
- A delegated Admin may operate only within Organisations explicitly assigned to them.
- A Platform Owner can operate across Organisations using explicit Organisation context.
- Admins do not impersonate Customer credentials.
- A Candidate is not an authenticated Work Track user.
- An Application represents one Candidate being considered for one Job.
- Application stage changes are human-driven and persisted.
- Candidate email is optional and is not treated as a unique identity.
- The MVP intentionally omits destructive Job/Candidate deletion.
- AI assessment is advisory decision-support and must not autonomously hire,
  reject or advance Candidates.

## Local development

Requirements:

- Node.js 24
- npm
- access to the configured Supabase project for authenticated functionality

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
```

Additional server-only AI configuration may be required by the final assessment
implementation.

Never commit `.env`, `.env.local`, `.env.production`, API keys, passwords or
temporary account credentials.

Without valid runtime configuration, protected functionality fails closed.

## Database migrations

Migrations are versioned under `supabase/migrations/`.

Current applied foundations include:

```text
20260921000100_identity_foundation.sql
20260921000200_account_provisioning.sql
20260922000100_recruitment_core.sql
```

The recruitment migration creates `jobs`, `candidates` and `applications`,
enables RLS, applies least-privilege grants, and reinforces same-Organisation
relationships with composite foreign keys.

The live recruitment SQL acceptance suite passed against disposable Auth fixtures
and rolled back all fixture application data after execution.

## Verification

From `application/`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Current verified result:

```text
Lint:        passed
Typecheck:   passed
Tests:       43 passed, 0 failed
Build:       passed
```

The test suite covers identity/profile validation, role enforcement, tenant
isolation, provisioning failure handling, Admin assignment checks, recruitment
validation, cross-tenant relationship rejection, pipeline filtering, stage-only
updates, and migration security contracts.

A non-blocking Node module-type detection warning is currently emitted by the
test runner; it does not fail lint, typecheck, tests or the production build.

## Deployment

The live environment is:

```text
https://worktrack.go-sh.dev
```

Production runs in Docker on a Hostinger VPS behind Nginx Proxy Manager and HTTPS.

The application container:

- uses a multi-stage build;
- runs as a non-root user;
- exposes the application only through the existing reverse-proxy network;
- keeps production secrets outside the repository and image;
- exposes `/api/health` for application liveness.

`/api/health` intentionally reports application liveness only and does not expose
database, authentication-provider or AI-provider details.

## Project documentation

Key design and implementation documents live under `docs/`, including:

- [`01-product-vision.md`](docs/01-product-vision.md)
- [`05-architecture.md`](docs/05-architecture.md)
- [`06-security.md`](docs/06-security.md)
- [`07-identity-foundation.md`](docs/07-identity-foundation.md)
- [`08-account-provisioning.md`](docs/08-account-provisioning.md)
- [`09-recruitment-core-backend.md`](docs/09-recruitment-core-backend.md)

## AI-assisted development

AI tools were used deliberately during implementation for code generation,
review, testing support and iteration. Security-sensitive code was still reviewed
against the documented trust boundaries, authorization model, RLS policies and
database constraints.

The guiding implementation rule is:

> A feature is not complete if it only works when security controls are weakened.

## Final delivery

The final submission will include:

- this GitHub repository;
- the deployed Work Track URL;
- Platform Owner/Admin and regular Customer demo credentials provided privately;
- a short walkthrough video explaining the implementation and design decisions;
- delivery assumptions and any intentional MVP trade-offs.
