# Milestone 3 — Organisation and Account Provisioning review

Status: local implementation for review. The new migration and acceptance suite
have **not** been executed against managed Supabase. No real accounts were
created, real environment values changed, or deployment performed.

## Requirements and scope

FR-003, FR-004, FR-005, FR-010, FR-012, FR-014 and FR-015. Supporting controls:
QR-SEC-001/002/003/004/006/007, QR-REL-003/004/006, QR-USE-002/004,
QR-ACC-001/002/003, QR-MNT-003/004/005/006, QR-PRI-004 and QR-DEP-002/004.

Platform Owner is the challenge's platform-level Admin. Delegated Admins may
provision Customers only in assigned Organisations. There are no additional
roles, lifecycle fields, invitations, SMTP, recovery, MFA, public signup,
recruitment features or Owner provisioning function.

## Full migration and exact database design

The complete SQL, including every function body and privilege statement, is
[20260921000200_account_provisioning.sql](../supabase/migrations/20260921000200_account_provisioning.sql).

No tables, columns, indexes, relationships, RLS policies or existing helpers
change. Existing constraints enforce:

- Profile UUID is an existing Auth UUID; duplicate profiles fail.
- Customer profile has exactly one existing Organisation.
- Admin profile has no Organisation.
- Names are trimmed, nonempty and at most 200 characters.
- Assignment refers to an Admin profile via the existing composite foreign key.
- One assignment per Admin/Organisation pair.

The migration is wrapped in one transaction and creates five public RPCs:

| Function and parameters | Return | Allowed actor | Effect |
| --- | --- | --- | --- |
| `provision_customer_organisation(target_auth_user_id uuid, organisation_name text, customer_full_name text)` | UUID of new Organisation | Owner | Inserts Organisation and Customer profile atomically. Either both commit or neither does. |
| `provision_customer_for_organisation(target_auth_user_id uuid, organisation_id uuid, customer_full_name text)` | Target profile UUID | Owner or currently assigned Admin | Inserts one Customer profile in the specified Organisation. |
| `provision_admin(target_auth_user_id uuid, admin_full_name text)` | Target profile UUID | Owner | Inserts an Admin profile with NULL Organisation. |
| `assign_admin_to_organisation(admin_id uuid, organisation_id uuid)` | void | Owner | Inserts assignment. Duplicate pair is an authorised no-op. |
| `unassign_admin_from_organisation(admin_id uuid, organisation_id uuid)` | void | Owner | Deletes that assignment. Missing pair is an authorised no-op. |

Each function derives its actor from `auth.uid()`, reads the trusted profile,
uses `SECURITY DEFINER`, `SET search_path = ''`, schema-qualified references,
and is owned by `postgres`. None accepts a role or actor ID from the browser.
There is no dynamic SQL. A missing profile or subject fails authorization.

`FOR SHARE` locks keep the actor role stable until the RPC transaction ends.
Delegated Customer provisioning also locks the qualifying assignment: an
already-authorised transaction may finish before concurrent unassignment;
after unassignment commits, new calls are denied. The UI's earlier permission
check cannot bypass this database recheck.

For **each of the five signatures**, the migration performs:

```sql
alter function <signature> owner to postgres;
revoke all on function <signature> from public, anon, service_role;
grant execute on function <signature> to authenticated;
```

No table grants are added. `authenticated` retains SELECT under existing RLS;
`anon` and `service_role` retain no direct foundation-table privileges. The
secret client is never used for table access or RPC calls. No new RLS policies
are needed: mutations run only through these reviewed capability functions.

## Application flow and boundaries

Server Actions verify a fixed request origin, authenticate through Supabase,
load a trusted profile, validate input with Zod, and check Organisation access
before constructing the server-only administrative client. For Customer
creation, the requested Organisation is also read under the actor's RLS.

The Auth-only wrapper uses `createUser({email, password, email_confirm: true})`.
Session storage, auto-refresh and URL session detection are disabled on that
client. It exposes only create and compensating-delete methods. It never
changes the actor's session. Profile creation uses the actor's ordinary
authenticated client to call the specific RPC. Supabase stores the password
through its normal Auth password handling; Work Track never stores plaintext.

Passwords contain 24 cryptographically random bytes encoded as 32 base64url
characters (192 bits of randomness), with an additional fixed `Aa1!` prefix
for common category requirements. The fixed prefix is not counted as entropy.
There is no forced password-change feature in this milestone.

Only confirmed or read-back-reconciled successful provisioning returns the email and temporary
password. The Client Component keeps that result in memory in its open panel;
dismissal clears it and refreshes the lists. The password is not placed in a
URL, storage API, database, log, or previous Server Action state. There is no
credential retrieval endpoint. Losing the success response or closing the
panel means the password cannot be retrieved from Work Track. As with any
credential delivery over HTTP, delivery cannot be made exactly-once across
network failures; the application offers a single success display, not a
persistent recovery channel.

## Partial failure and recovery

| Outcome | Behaviour |
| --- | --- |
| Input, actor or scope rejected before Auth creation | No privileged operation. Safe error. |
| Missing/invalid secret configuration | No Auth request. Existing login remains available. |
| Auth creation fails or its result is lost | No RPC; safe review-required error. Never delete an existing identity by email. |
| RPC succeeds with a result | Show credentials once. |
| Explicit PostgreSQL rejection (SQLSTATE class 22, 23, 40, 42 or P0) | Immediately attempt deletion of only the newly created Auth UUID. The failed RPC transaction has rolled back its Organisation/profile writes. |
| Compensating deletion fails or its result is lost | Safe review-required error with the target UUID; never include SDK details or passwords. |
| RPC timeout, network/gateway error, lost or malformed response | Read back using the actor's normal client. Return credentials only for a matching profile/resource and current authority; otherwise retain identity with a review-required error. |

### Read-after-write reconciliation hardening

After an ambiguous RPC result or thrown transport error, the workflow performs
one reconciliation attempt using the **same actor-session client** that invoked
the RPC. It never constructs or uses a privileged table client:

1. SELECT the target profile by the Auth UUID returned by this creation attempt.
   Query errors or malformed profile data are inconclusive. An empty result is
   explicitly classified as `not_observed`, not as proof of non-commit.
2. Validate the exact target UUID and requested full name. Admin provisioning
   requires `admin` with NULL Organisation. Customer provisioning requires
   `customer` with an Organisation; an existing-Organisation request must match
   its exact UUID.
3. Read the actor's current profile through that session. Require Owner for
   Admin/new-Organisation operations. Existing-Organisation Customer creation
   also permits a current Admin, after reading and validating the exact
   actor/Organisation assignment again. Missing/revoked authority is inconclusive.
4. For a Customer, read the linked Organisation by its exact UUID. Require the
   requested Organisation name for new-Organisation provisioning. Missing,
   mismatched or unreadable resources are inconclusive.
5. A complete match returns the original generated credentials through the
   existing one-time panel. No Auth/RPC retry and no second password generation.
6. Otherwise retain the Auth identity and return the safe review-required error
   without a password. Explicit SQL rejections still compensate immediately;
   failed compensation still requires administrative review.

**Conclusive-absence limitation:** a successful empty SELECT after a transport
failure is insufficient for deletion, even for an Owner. The original RPC
transaction may still be running and commit after the read's snapshot. For an
Admin, revoked assignment can additionally make a committed row invisible.
Separate actor/assignment queries, repeated empty reads, or arbitrary delays
cannot establish transaction completion. Blind Auth deletion could then
cascade-delete the newly committed profile and leave its Organisation behind.

The unchanged RPC/API contract supplies no completion barrier or operation
receipt. Therefore this pass does **not** claim to implement or test
"ambiguous RPC + conclusively absent profile → cleanup" in production. There
is no safely establishable conclusive-absence state with these reads alone.
It tests empty/hidden/in-flight results → retention instead, following the
approved fallback for states that cannot be established conclusively. Enabling
additional ambiguous-outcome deletion would need a separately reviewed database
coordination design. No such mechanism or migration change is introduced here.

The error panel disables retries until dismissed. There is no automatic retry
of Auth creation or database provisioning. Existing-email errors cannot cause
deletion of the pre-existing account. No raw provider errors are logged or
returned. A process crash between Auth creation and the RPC can also leave an
unprofiled Auth user; this two-service workflow is not a distributed transaction.
No journal, background recovery service or extra table is introduced.

Reconciliation is a trusted manual administrative process, **not performed at
this checkpoint**:

1. Use the displayed UUID, or submitted email and creation time if the Auth
   response was lost, to inspect the exact identity in trusted Auth administration.
2. Inspect the associated profile and Organisation through trusted read-only
   administration. Establish whether the RPC committed before retrying/deleting.
3. If there is no profile and the identity is demonstrably the newly created
   disposable target, remove it through trusted Auth administration, then retry.
4. If a profile/Organisation committed, preserve them. Arrange a separately
   authorised credential recovery or reviewed correction; do not delete Auth
   blindly or create a duplicate Organisation. Work Track has no password
   recovery UI in this milestone.
5. If identity ownership or transaction outcome remains uncertain, leave it
   unchanged and investigate. Never identify a deletion target solely by email.

## Routes and UI

- `/platform`: Organisation list and New Organisation / Customer; Admin list
  and New Admin.
- `/platform/organisations/[organisationId]`: Owner-only details, Customer
  accounts, Add Customer, Admin assignments, Assign/Unassign and Manage workspace.
- `/admin`: RLS-scoped assigned Organisations, Add Customer and Manage workspace.
- `/workspace/[organisationId]`: Owner/Admin Organisation context validated by
  `requireOrganisationAccess`; visible “Managing Customer Workspace: …” and
  return to `/platform` or `/admin`.
- Customers visiting the selected-context route are redirected to `/workspace`,
  which derives Organisation from their profile.

Lists retain the bounded demo size of 100 rows and explicitly announce that
limit. Full pagination is not introduced. Existing dark sidebar, light
workspace, lime actions and compact bordered surfaces are retained.

## Environment and dependencies

Only `.env.example` changes. `SUPABASE_SECRET_KEY=` is an empty server-only
placeholder accepting the new `sb_secret_` format. It must not use `NEXT_PUBLIC_`.
The existing server-read `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `APP_URL`
remain unchanged. Real `.env.local` and production configuration are untouched.
Docker's existing allowlist includes the new source and excludes environment files.

No dependencies or lockfiles changed. Existing production versions remain:
`@supabase/supabase-js` 2.116.0, `@supabase/ssr` 0.12.7, `zod` 4.6.5,
`server-only` 0.0.1, Next.js 16.3.5, React/React DOM 19.3.0.
Randomness uses built-in Node Crypto.

## Files

Created:

- `supabase/migrations/20260921000200_account_provisioning.sql`
- `supabase/tests/account_provisioning.sql`
- `application/lib/supabase/admin.ts`
- `application/lib/validation/provisioning.ts`
- `application/lib/provisioning/actions.ts`
- `application/lib/provisioning/policy.ts`
- `application/lib/provisioning/password.ts`
- `application/lib/provisioning/workflow.ts`
- `application/lib/provisioning/reconciliation.ts`
- `application/components/provisioning/account-form.tsx`
- `application/components/provisioning/assignment-form.tsx`
- `application/app/platform/organisations/[organisationId]/page.tsx`
- `application/app/workspace/[organisationId]/page.tsx`
- `application/tests/provisioning.test.mjs`
- `application/tests/provisioning-actions.test.mjs`
- `application/tests/provisioning-workflow.test.mjs`
- `application/tests/provisioning-security.test.mjs`
- `docs/08-account-provisioning.md`

Modified:

- `application/.env.example`
- `application/lib/env.ts`
- `application/lib/supabase/database.types.ts`
- `application/app/platform/page.tsx`
- `application/app/admin/page.tsx`

The applied identity migration, bootstrap, existing RLS suite, Dockerfile and
real environment values are unchanged.

## Validation and remaining approval gates

Offline tests exercise the actual Server Actions with mocked request/SDK
boundaries, plus validation, policy, password generation and workflow modules.
They cover denied actors/origins/input before privileged client construction,
actor-and-Organisation assignment filtering, use of actor RPC credentials,
post-Auth permission revocation, safe compensation and cleanup failures,
ambiguous outcomes, role destinations and separate secret configuration.

The bounded hardening pass changes only these seven files (relative to the
initial Milestone 3 review checkpoint):

- `application/lib/provisioning/actions.ts`
- `application/lib/provisioning/workflow.ts`
- `application/lib/provisioning/reconciliation.ts` (new)
- `application/tests/provisioning-actions.test.mjs`
- `application/tests/provisioning-workflow.test.mjs`
- `application/tests/provisioning-security.test.mjs` (new)
- `docs/08-account-provisioning.md`

Additional verification covers recovered success for all three provisioning
operations; exact actor-session queries; profile/role/name/Organisation mismatch;
query failure; assignment/role revocation; an RPC committing after an empty read;
retained identities without password disclosure; compensation deletion failures;
and reusing the original password without retrying Auth or the RPC.

The actual Auth wrapper is tested with an offline SDK stub: its payload is
exactly email/password/`email_confirm: true`, with no user/app role metadata.
It exposes only Auth create/delete methods and disables session persistence.
Source regression assertions verify that privileged key references occur only
in the server-only env/admin modules, that no privileged `NEXT_PUBLIC_` variable
exists in runtime source, and that the credential panel clears in-memory state
without resubmitting it. Reviewed password paths contain no logging, file writes,
URL/query-string storage, cookies, localStorage or sessionStorage. Password
generation still uses Node `randomBytes(24)`. Source/ACL assertions complement,
but do not replace, future managed database and browser acceptance tests.

[account_provisioning.sql](../supabase/tests/account_provisioning.sql) is a
transactional acceptance suite requiring **eight separately approved disposable
Auth identities with no profiles**. It does not mutate `auth.users` through SQL.
JWT simulation sets subject, role and combined claims explicitly. Cases cover
all requested success/denial paths, duplicate/unknown targets, invalid
relationships/names, assignment removal, cross-tenant reads/writes, restrictive
ACLs, function ownership/search path, and missing-profile/subject rejection.
All fixture application rows roll back. Post-rollback verification compares
counts against the pre-suite state and checks that none of the eight fixture
profiles remain. The real Owner is preserved; tables are not assumed empty.

This suite is drafted, not executed. Real-session provisioning/login, browser
interaction validation and two-session assignment-race testing remain gated on
review, applying the migration and explicitly configuring the server secret.
Offline tests do not establish managed PostgreSQL runtime correctness.

Local check results:

- `npm run lint`: passed, zero warnings.
- `npm run typecheck`: passed.
- `npm test`: 32 tests passed, none failed or skipped. Node emits the existing
  module-type auto-detection warning; no dependency/configuration change was
  made solely to silence it.
- `docker build --tag work-track:milestone3-hardening application`: passed.
  Image `sha256:1602941dede3f8ae9dd5d81b3526980a049dcce8e6a0078d116859563493cf44`.
- Rebuilt-image inspection with networking disabled: 18 browser assets checked,
  no privileged markers, no root environment files, runtime UID 1000.
- `git diff --check`: passed.
- Applied identity migration SHA-256 remains
  `ecb7ba79e4514485eeee71d436685194d509891d367f7a6a94b0f2becdb9a861`.
- Reviewed provisioning migration is unchanged, SHA-256
  `761b062fa760ecb1e70b4c8489f8fb6b72e238b9809d6a4740fdb1706d5c7d08`.

These checks do not apply migrations, create accounts, exercise a real Auth
session, or certify managed-project SQL behaviour. Those are the next approval
gates. No Git commit, push or deployment was performed.
