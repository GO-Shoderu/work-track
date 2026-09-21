# Work Track

Coding challenge for Devotion Ventures.

Status: Milestone 2 — local identity/authentication implementation, awaiting SQL review.
The managed Supabase project is not connected and no migration has been applied.
Recruitment features and account provisioning are not implemented yet.

See [the complete Milestone 2 review and bootstrap runbook](docs/07-identity-foundation.md)
and [the SQL migration](supabase/migrations/20260921000100_identity_foundation.sql).

Deadline: 22 September 2026

## Application

The production Next.js App Router application lives in `application/`.
The material in `reference/` is a visual/interaction reference only.

Use Node.js 24 (the Docker build uses 24.18.0) and npm. Direct dependencies
are pinned in `package.json`; `package-lock.json` records the dependency tree.
No environment variables or credentials are needed to build or inspect disconnected
mode. `application/.env.example` contains placeholders only. Do not configure the
managed project or execute SQL before the migration review is approved.

```bash
cd application
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The entry redirects to login. Without configuration,
sign-in is unavailable and protected pages fail closed. The UI uses the approved
Work Track colour tokens and system-font fallback. No remote font request is
required. `/api/health` returns only `{"status":"ok"}`; it checks
application liveness, not database or external-service readiness.

## Verification

Run from `application/`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit
docker compose config --quiet
docker compose build
docker compose up -d
curl --fail http://127.0.0.1:3000/
curl --fail http://127.0.0.1:3000/api/health
docker compose exec -T web id
docker compose logs web
docker compose down
```

`typecheck` generates Next.js route types before checking TypeScript.
Next.js generates `next-env.d.ts`; it is intentionally ignored by Git.
Review audit findings deliberately; do not automatically apply fixes.

In the Codex host environment used for initial verification, Turbopack's CSS
worker was blocked from binding a local port (`Operation not permitted`),
including on an elevated retry. The same production build passed inside
Docker. Use the container build to verify this deployment target when that
host restriction applies; do not treat the failed host build as a pass.

ESLint 9.39.5 is pinned because the lint plugins bundled by
`eslint-config-next` 16.3.5 do not yet declare compatibility with ESLint 10.
npm marks ESLint 9 deprecated; revisit this development-only dependency when
the bundled plugins support an upgrade. Do not force incompatible peers.

## Container deployment foundation

The multi-stage Docker build uses a digest-pinned Node image, `npm ci` and Next.js standalone output.
The runtime runs as the non-root `node` user, includes the standalone server
and static assets, and has an HTTP liveness check. The build context uses an
allowlist and excludes environment files and private keys.

Compose binds port 3000 to host loopback only. The process listens on all
interfaces **inside the container** so Docker can forward that loopback port.
No production secrets should be placed in an image or committed to Git.
Docker build dependencies require registry access on an uncached build.

The confirmed live deployment is https://worktrack.go-sh.dev, Docker container
`work-track-web` on the `proxy` network on Hostinger VPS, behind Nginx Proxy Manager.
The managed Supabase Cloud project **Work Track**, Central EU (Frankfurt), is the
approved development/demo backend. No local Supabase is used. VPS, DNS, reverse
proxy and network configuration are frozen during Milestone 2.

The local Compose commands above concern local application verification only;
they must not be run against the live deployment as part of this milestone.
The Docker source allowlist includes the new authentication modules. The complete
container build and disconnected smoke tests pass without project configuration.
Live authentication/RLS acceptance remains pending approval to apply SQL and connect.
