# Milestone 2 — identity foundation review checkpoint

Status: local implementation only. The migration, bootstrap and database tests have
NOT been executed. The application has NOT been connected to Supabase. No Auth
users have been created. Database and real authentication acceptance remains pending.

The approved environment is the managed Supabase Cloud project **Work Track**,
Central EU (Frankfurt), used for challenge development/demo. No local Supabase.
Production remains https://worktrack.go-sh.dev, Docker container `work-track-web`
on the `proxy` network behind Nginx Proxy Manager. This milestone changes only the
Docker source allowlist; it does not change VPS, DNS, proxy or network configuration.

## Complete review artifacts

- [Complete SQL migration](../supabase/migrations/20260921000100_identity_foundation.sql)
- [First-owner bootstrap template](../supabase/bootstrap/first_platform_owner.sql)
- [Database acceptance assertions](../supabase/tests/identity_foundation.sql)

The migration is a single transaction with no data seeds. It expects a fresh
foundation: the named tables, enum, and `private` schema must not already exist.
After approval, inspect the target before applying; do not replace existing objects
or retry around collisions blindly. Apply as `postgres` and retain this migration
in the versioned migration history. Keep `private` out of exposed Data API schemas.
There are no project-link, database-reset, or automatic migration scripts.

## Full schema design

`public.app_role` is an enum: `platform_owner`, `admin`, `customer`. This is an
application role, not the Supabase `authenticated` database role.

| Table | Columns and constraints |
| --- | --- |
| `organisations` | `id uuid PK DEFAULT gen_random_uuid()`; `name text NOT NULL`, trimmed, 1–200 characters; `created_at` and `updated_at timestamptz NOT NULL DEFAULT now()` |
| `profiles` | `id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE`; `full_name text NOT NULL`, trimmed, 1–200 characters; `role app_role NOT NULL`, no default; `organisation_id uuid NULL REFERENCES organisations(id) ON DELETE RESTRICT`; both timestamps as above; unique `(id, role)` |
| `admin_organisation_assignments` | `admin_id uuid NOT NULL`; `organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT`; `admin_role app_role NOT NULL DEFAULT 'admin' CHECK (= 'admin')`; `created_at timestamptz NOT NULL DEFAULT now()`; PK `(admin_id, organisation_id)`; composite FK `(admin_id, admin_role) → profiles(id, role) ON UPDATE RESTRICT ON DELETE CASCADE` |

Profile constraint: Customers must have one Organisation; Owners/Admins must have
NULL organisation membership. Multiple Customer users can share an Organisation.
Organisation names are not unique. Assignments cannot target Customers or Owners.
Assigned Admins cannot change role without removing their assignments first.

Indexes: PK/unique indexes plus a partial index on non-null
`profiles.organisation_id` and an index on assignment `organisation_id`.
No status, lifecycle, email duplication, recruitment tables, or audit tables.

## Every helper and trigger

All definitions are in the complete migration above:

- `private.current_app_role() → app_role`: current `auth.uid()` profile role;
  NULL if no matching profile.
- `private.current_customer_organisation_id() → uuid`: current Customer profile's
  Organisation; NULL for missing profiles or other roles.
- `private.is_assigned_admin(target_organisation_id uuid) → boolean`: true only
  when the current profile is an Admin with that exact assignment. Caller identity
  cannot be supplied as an argument.
- `private.set_updated_at() → trigger`: sets `NEW.updated_at = now()` before
  Organisation or profile updates. It is SECURITY INVOKER, not a privileged RPC.

The three policy helpers are SQL, STABLE, SECURITY DEFINER, owned by `postgres`,
with an empty `search_path` and qualified relation names. They perform SELECT only,
use `auth.uid()` for identity, and avoid recursive RLS lookups. The trusted owner
bypasses RLS only inside these narrow lookups; RLS remains enabled on all tables.
No dynamic SQL or mutation helper is exposed.

## Every grant/revoke

- Revoke ALL table privileges on all three tables from PUBLIC, `anon`,
  `authenticated`, and `service_role` (including TRUNCATE/REFERENCES/TRIGGER).
- Grant only SELECT on all three tables to `authenticated`.
- Revoke ALL on `app_role` from those same four roles; grant USAGE to `authenticated`.
- Grant USAGE on `public` schema to `authenticated` (no new CREATE privilege).
- Create `private` owned by `postgres`; revoke ALL schema privileges from the four
  roles; grant only USAGE to `authenticated`.
- Set each of the four functions' owner to `postgres`.
- Revoke ALL function privileges on all four functions from the four roles.
- Grant EXECUTE only on the three policy helpers to `authenticated`.
- No application EXECUTE grant on the trigger function; no mutation grants.

Postgres administrative ownership remains the explicit bootstrap/migration boundary.
A service-role client is neither configured nor used. Future provisioning must
review its required grants; this milestone does not pre-authorise that API path.

## Every RLS policy

All are SELECT policies TO `authenticated`:

| Policy | Permits |
| --- | --- |
| `organisations_select_owner` | Owner reads every Organisation |
| `organisations_select_assigned_admin` | Admin reads assigned Organisations |
| `organisations_select_customer` | Customer reads their profile's Organisation |
| `profiles_select_self` | Current user reads own profile |
| `profiles_select_owner` | Owner reads every profile |
| `profiles_select_assigned_customers` | Admin reads Customer profiles in assigned Organisations |
| `assignments_select_owner` | Owner reads all assignments |
| `assignments_select_self_admin` | Admin reads own assignments |

The SELECT policies combine permissively (OR). There are no INSERT, UPDATE or
DELETE policies for any role. Customers cannot read other profiles or assignments.
Owners also cannot mutate these tables through the Data API in this milestone.

## Exact first-owner bootstrap (after separate approval only)

1. Confirm the target is **Work Track**, Central EU (Frankfurt), and the reviewed
   migration has been applied successfully. Verify the Auth settings already
   reported by the developer: public signup off, anonymous sign-in off, email/password only.
2. An authorised human uses the Supabase Dashboard's Authentication user-management
   action to create the intended Owner's email/password identity. Set a strong,
   unique password privately. Mark email confirmed only after independently verifying
   the intended owner's address/control. No invitation flow or app endpoint is used.
3. Copy the new Auth user UUID. Verify the UUID, email, confirmed state and
   non-anonymous state in trusted administration. Do not paste the password here,
   into SQL, source code, logs or a commit.
4. Open a private SQL Editor copy of `supabase/bootstrap/first_platform_owner.sql`.
   Replace `target_user_id`, `expected_email`, and `owner_full_name` NULL values
   with the verified UUID/email/name. Run as `postgres` only after approval.
5. The transaction locks `profiles`, rejects an existing Owner, rejects an existing
   profile for that identity, checks the confirmed Auth UUID/email, and inserts
   exactly one Owner profile with NULL Organisation. It never upserts or promotes.
6. Verify the inserted profile, then configure the approved application environment
   separately and test password login into `/platform` and RLS Owner visibility.
7. Re-running bootstrap must fail. If the profile step fails, the Auth identity
   remains without application access; inspect the cause and deliberately complete
   the bootstrap or remove the unused identity through trusted administration.

Creating an Auth identity and inserting a profile are not one cross-service transaction.
No identity/profile is created automatically at login. No public Owner registration.

## Application and session boundary

The app uses server-mediated email/password login and POST logout Server Actions.
Roles and Customer memberships come only from the current validated profile.
The origin must match configured `APP_URL`, in addition to Next.js origin checks.
No user-controlled redirect destination or role selection exists.

`proxy.ts` refreshes cookies with `getClaims()` and forwards refreshed cookies to
both rendering and the response. Protected pages independently call `getUser()`
and read their profile with the user's Supabase client. Future tenant operations
must invoke `requireOrganisationAccess()` at each operation boundary; it validates
UUIDs, Customer membership, or a current Admin assignment before querying the
Organisation under RLS. There is no Admin context-switching feature yet.

Clients are per-request, requests have bounded timeouts and no-store fetches, and
responses get private/no-store headers. Identity is not cached between requests.
Cookie session data is never returned to a Client Component. HTTP-only, host-only,
SameSite=Lax cookies are Secure on HTTPS origins. There is no browser SDK client.
Read-only render clients do not write cookies; Proxy owns rendering-time refresh.
Writable clients are used only in Server Actions.

Logout uses Supabase's local-session scope. Errors do not falsely claim successful
logout. A copied JWT can remain valid until expiry even after logout; no immediate
JWT revocation mechanism is claimed. Role/assignment changes take effect from the
current database rows without requiring new JWT role claims.

Absent/invalid environment configuration creates no Supabase client. Login shows
an unavailable state; protected pages fail closed. Root redirects may be streamed
HTML redirects because Next.js has a loading boundary. Protected content is never
rendered before its page-level authorization check.

## Configuration and dependencies

Only `.env.example` placeholders exist. No `.env.local` was created.

| Variable | Classification |
| --- | --- |
| `SUPABASE_URL` | Browser-safe endpoint, read only on server |
| `SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key, read only on server; accepts `sb_publishable_` format only |
| `APP_URL` | Non-secret server configuration; exact origin, no credentials/path/query |

No `NEXT_PUBLIC_*`, service-role key, database password, CLI token, or AI key in
application configuration. Administrative tooling credentials remain outside the app.

Pinned additions: `@supabase/supabase-js` 2.116.0, `@supabase/ssr` 0.12.7,
`zod` 4.6.5, `server-only` 0.0.1. No other direct dependency or framework upgrade.
The lockfile includes their required transitive packages. Node 24's built-in test
runner is used; no test framework dependency was added.

## Verification at this checkpoint

Passed: lint, TypeScript, seven offline validation/authorization/configuration/cookie
checks, `git diff --check`, production Docker build without environment values,
and network-disabled container smoke checks for health, login, streamed root
redirect, cache headers, and protected routes failing closed. Installation/build
audits reported zero vulnerabilities.

The host Turbopack build failed on sandbox port binding, as recorded in Milestone 1;
the same build passed in Docker. Existing ESLint deprecation and blocked resolver
postinstall warnings remain. Node tests emit a harmless module-format detection
warning. No additional dependencies/scripts were approved to suppress these.

NOT RUN: migration execution, SQL assertions, live password login, real refresh/
logout, browser session/CSRF tests, direct Data API tests, or real cross-tenant tests.
Offline policy tests are not proof that RLS works in PostgreSQL.

The SQL acceptance file requires seven separately approved disposable Auth identities
and no existing profiles. It creates application fixtures in a transaction, switches
to ordinary `authenticated`/`anon` database roles with test claims, checks visibility,
mutation denial, metadata spoofing, assignment removal and constraints, then rolls
back. It does not create users or install extensions. Do not run it before approval.

After approval, also test real user tokens through the Data API and real app sessions:
Customer A/B isolation; Admin A cannot access B; Owner visibility; no-profile denial;
assignment removal with an existing token; tampered/expired sessions; logout and
refresh; origin rejection; concurrent-user/cache isolation; service outages; and
absence of secrets in browser payloads/logs. Supabase signup settings must be verified.

## Requirements and implementation details differing from the proposal

FR-001/002/008/010/011/014/015/065, with the FR-005 privilege restriction and
FR-012/060/064 foundation only. QR-SEC-001–004/006–007, QR-REL-003/006,
QR-USE-004, QR-ACC-001–005, QR-MNT-001–006, QR-PRI-004 and QR-DEP-002/004.
These are implementation targets; remote acceptance remains pending.

No scope/role/schema deviation. Minor implementation choices:

- New-format publishable keys only, rather than optional legacy anon JWT support.
  This rejects accidentally supplied privileged keys early.
- Types are hand-maintained pending approved schema generation; no project contacted.
- Shared Brand/workspace-shell components and a pure policy module were added.
- Minimal organisation lists are capped at 100 and say when capped; management and
  pagination are deferred. No profile directory or Admin context switch was added.
- A separate guarded bootstrap SQL template is supplied for review, not run.
- Docker allowlist changes are now explicitly approved; all other infrastructure files unchanged.

## File inventory

- `README.md`
- `application/.dockerignore`
- `application/.env.example`
- `application/app/access-denied/page.tsx`
- `application/app/admin/page.tsx`
- `application/app/error.tsx`
- `application/app/globals.css`
- `application/app/loading.tsx`
- `application/app/login/login-form.tsx`
- `application/app/login/page.tsx`
- `application/app/page.tsx`
- `application/app/platform/page.tsx`
- `application/app/workspace/page.tsx`
- `application/components/auth/logout-button.tsx`
- `application/components/brand.tsx`
- `application/components/workspace-shell.tsx`
- `application/lib/auth/actions.ts`
- `application/lib/auth/authorization.ts`
- `application/lib/auth/identity.ts`
- `application/lib/auth/policy.ts`
- `application/lib/env.ts`
- `application/lib/supabase/database.types.ts`
- `application/lib/supabase/proxy.ts`
- `application/lib/supabase/server.ts`
- `application/lib/validation/auth.ts`
- `application/package-lock.json`
- `application/package.json`
- `application/proxy.ts`
- `application/tests/auth.test.mjs`
- `docs/07-identity-foundation.md`
- `supabase/bootstrap/first_platform_owner.sql`
- `supabase/migrations/20260921000100_identity_foundation.sql`
- `supabase/tests/identity_foundation.sql`
