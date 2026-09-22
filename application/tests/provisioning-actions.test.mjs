import assert from "node:assert/strict";
import { test, after } from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";

// Exercise the actual Server Actions offline. Replace only framework/request
// boundaries and SDK clients; never load real env files or make network calls.
const globalKey = "__worktrackProvisioningActionTest";
const mocks = {
  "next/headers": `export async function headers() { return new Headers({origin: globalThis.${globalKey}.origin}); }`,
  "../env": 'export function getEnvironment() { return { APP_URL: "http://localhost:3000" }; }',
  "../auth/identity": `export async function readIdentity() { return globalThis.${globalKey}.identity; }`,
  "../supabase/admin": `export function createAuthAdministrator() { const f=globalThis.${globalKey}; f.calls.push(["admin-client"]); return f.administrator; }`,
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/lib/provisioning/actions.ts") && mocks[specifier]) {
      return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { provisionAccount, changeAssignment } = await import("../lib/provisioning/actions.ts");
hooks.deregister();
after(() => { delete globalThis[globalKey]; });

const org = "11111111-1111-4111-8111-111111111111";
const actor = "22222222-2222-4222-8222-222222222222";
const target = "33333333-3333-4333-8333-333333333333";
const account = { kind: "customer", email: "new@example.invalid", fullName: "New Customer", organisationId: org };
function setup(role = "platform_owner", assigned = false) {
  const f = { origin: "http://localhost:3000", calls: [], assigned, orgExists: true, rpcError: null,
    targetProfile: { id: target, full_name: "New Customer", role: "customer", organisation_id: org },
    organisationName: "Acme", readErrorTable: null, afterRpc: () => {}, rpcThrows: false };
  f.identity = {
    kind: "authenticated", profile: { id: actor, full_name: "Actor", role, organisation_id: null },
    client: {
      from(table) {
        const filters = {};
        const query = {
          select() { return query; },
          eq(key, value) { filters[key] = value; return query; },
          async maybeSingle() {
            f.calls.push(["read", table, filters]);
            if (f.readErrorTable === table) return { data: null, error: { message: "offline provider error" } };
            const data = table === "profiles" ? (filters.id === actor ? f.identity.profile : f.targetProfile)
              : table === "admin_organisation_assignments" ? (f.assigned ? { admin_id: actor, organisation_id: org } : null)
              : (f.orgExists ? { id: org, name: f.organisationName } : null);
            return { data, error: null };
          },
        };
        return query;
      },
      async rpc(name, args) {
        f.calls.push(["actor-rpc", name, args]);
        f.afterRpc();
        if (f.rpcThrows) throw new Error("offline transport error");
        return { data: f.rpcError ? null : target, error: f.rpcError };
      },
    },
  };
  f.administrator = {
    async createUser(email, password) {
      assert.match(password, /^Aa1![A-Za-z0-9_-]{32}$/);
      f.calls.push(["auth-create", email]);
      return { data: { user: { id: target } }, error: null };
    },
    async deleteUser(id) { f.calls.push(["auth-delete", id]); return { error: null }; },
  };
  globalThis[globalKey] = f;
  return f;
}

test("Server Action rejects foreign origins, missing identity, Customer role and invalid inputs before Auth administration", async () => {
  for (const configure of [
    (f) => { f.origin = "https://other.invalid"; },
    (f) => { f.identity = { kind: "anonymous" }; },
    (f) => { f.identity.profile.role = "customer"; },
  ]) {
    const f = setup(); configure(f);
    assert.equal((await provisionAccount(account)).ok, false);
    assert.equal(f.calls.length, 0);
  }
  const f = setup();
  assert.equal((await provisionAccount({ ...account, role: "platform_owner" })).ok, false);
  assert.equal(f.calls.length, 0);
});

test("Ambiguous Customer RPC reconciles target UUID, actor role, assignment and Organisation through the user client", async () => {
  const f = setup("admin", true);
  f.rpcThrows = true;
  const result = await provisionAccount(account);
  assert.equal(result.ok, true);
  assert.match(result.password, /^Aa1![A-Za-z0-9_-]{32}$/);
  assert.deepEqual(f.calls.slice(-4), [
    ["read", "profiles", { id: target }], ["read", "profiles", { id: actor }],
    ["read", "admin_organisation_assignments", { admin_id: actor, organisation_id: org }],
    ["read", "organisations", { id: org }],
  ]);
  assert.equal(f.calls.filter(([kind]) => kind === "auth-create").length, 1);
  assert.equal(f.calls.filter(([kind]) => kind === "actor-rpc").length, 1);
  assert.equal(f.calls.some(([kind]) => kind === "auth-delete"), false);
});

test("Owner recovers Admin and new Organisation operations only with their expected relationships", async () => {
  for (const kind of ["admin", "organisation"]) {
    const f = setup();
    f.rpcError = { code: "" };
    const input = { kind, email: account.email, fullName: account.fullName, ...(kind === "organisation" ? { organisationName: "Acme" } : {}) };
    if (kind === "admin") f.targetProfile = { ...f.targetProfile, role: "admin", organisation_id: null };
    assert.equal((await provisionAccount(input)).ok, true);
    assert.equal(f.calls.some(([operation]) => operation === "auth-delete"), false);
  }
});

test("Missing/hidden profile, query error, mismatched relationship or revoked authority retain the identity", async () => {
  for (const change of [
    (f) => { f.targetProfile = null; },
    (f) => { f.readErrorTable = "profiles"; },
    (f) => { f.readErrorTable = "organisations"; },
    (f) => { f.readErrorTable = "admin_organisation_assignments"; },
    (f) => { f.targetProfile.id = actor; },
    (f) => { f.targetProfile.full_name = "Unexpected"; },
    (f) => { f.targetProfile.organisation_id = target; },
    (f) => { f.targetProfile.role = "admin"; f.targetProfile.organisation_id = null; },
    (f) => { f.assigned = false; },
    (f) => { f.orgExists = false; },
    (f) => { f.identity.profile.role = "customer"; f.identity.profile.organisation_id = org; },
  ]) {
    const f = setup("admin", true);
    f.rpcThrows = true;
    f.afterRpc = () => change(f);
    const result = await provisionAccount(account);
    assert.equal(result.needsReview, true);
    assert.equal("password" in result, false);
    assert.equal(f.calls.some(([operation]) => operation === "auth-delete"), false);
  }
  const f = setup();
  f.rpcThrows = true;
  f.organisationName = "Different Organisation";
  assert.equal((await provisionAccount({ kind: "organisation", email: account.email, fullName: account.fullName, organisationName: "Acme" })).needsReview, true);
});

test("An empty read while a timed-out RPC is still pending must not trigger destructive cleanup", async () => {
  const f = setup();
  f.rpcThrows = true;
  const committedLater = f.targetProfile;
  f.targetProfile = null;
  const result = await provisionAccount(account);
  // Model the original transaction committing after the reconciliation SELECT.
  f.targetProfile = committedLater;
  assert.equal(result.needsReview, true);
  assert.equal(f.calls.some(([operation]) => operation === "auth-delete"), false);
});

test("Assigned Admin scope is re-read using actor AND requested Organisation before Auth creation", async () => {
  const denied = setup("admin", false);
  assert.equal((await provisionAccount(account)).ok, false);
  assert.deepEqual(denied.calls, [["read", "admin_organisation_assignments", { admin_id: actor, organisation_id: org }]]);
  const allowed = setup("admin", true);
  assert.equal((await provisionAccount(account)).ok, true);
  assert.deepEqual(allowed.calls.map(([kind]) => kind), ["read", "read", "admin-client", "auth-create", "actor-rpc"]);
  assert.equal(allowed.calls.at(-1)[1], "provision_customer_for_organisation");
  assert.equal(allowed.calls.at(-1)[2].target_auth_user_id, target);
});

test("Only Owner can provision Organisations and Admins; actor RPC is separate from Auth administration", async () => {
  for (const input of [
    { kind: "admin", fullName: "Admin", email: "admin@example.invalid" },
    { kind: "organisation", fullName: "Customer", email: "customer@example.invalid", organisationName: "Acme" },
  ]) {
    const delegated = setup("admin", true);
    assert.equal((await provisionAccount(input)).ok, false);
    assert.equal(delegated.calls.length, 0);
    const owner = setup();
    assert.equal((await provisionAccount(input)).ok, true);
    assert.equal(owner.calls.at(-1)[1], input.kind === "admin" ? "provision_admin" : "provision_customer_organisation");
  }
});

test("RPC recheck rejection after Auth creation compensates, covering mid-request assignment removal", async () => {
  const f = setup("admin", true);
  f.rpcError = { code: "42501" };
  const result = await provisionAccount(account);
  assert.equal(result.ok, false);
  assert.deepEqual(f.calls.at(-1), ["auth-delete", target]);
  assert.equal("password" in result, false);
});

test("Assignment mutations require Owner and valid UUIDs; never construct Auth administrator", async () => {
  const input = { adminId: actor, organisationId: org, assign: true };
  for (const role of ["admin", "customer"]) {
    const f = setup(role, true);
    assert.ok((await changeAssignment(input)).error);
    assert.equal(f.calls.length, 0);
  }
  const f = setup();
  assert.ok((await changeAssignment({ ...input, adminId: "bad" })).error);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(await changeAssignment(input), {});
  assert.deepEqual(await changeAssignment({ ...input, assign: false }), {});
  assert.deepEqual(f.calls.map((call) => call.slice(0, 2)), [["actor-rpc", "assign_admin_to_organisation"], ["actor-rpc", "unassign_admin_from_organisation"]]);
});
