import assert from "node:assert/strict";
import { test } from "node:test";
import { runProvisioning, isConfirmedRejection } from "../lib/provisioning/workflow.ts";

// Offline sentinel, never a credential for any real identity.
const password = "offline-password-sentinel";
const id = "11111111-1111-4111-8111-111111111111";
function fixture(overrides = {}) {
  const calls = [];
  const dependencies = {
    password: () => password,
    create: async (value) => { calls.push(["create", value]); return { id, error: false }; },
    provision: async (value) => { calls.push(["rpc", value]); return { data: id, code: null }; },
    reconcile: async (value) => { calls.push(["reconcile", value]); return "inconclusive"; },
    remove: async (value) => { calls.push(["delete", value]); return true; },
    ...overrides,
  };
  return { calls, dependencies };
}

test("Success returns credentials only after Auth and actor RPC both succeed", async () => {
  const { calls, dependencies } = fixture();
  const result = await runProvisioning("new@example.invalid", dependencies);
  assert.deepEqual(calls, [["create", password], ["rpc", id]]);
  assert.deepEqual(result, { ok: true, email: "new@example.invalid", password });
});

test("Confirmed rejection immediately deletes exactly the newly-created UUID", async () => {
  for (const code of ["42501", "23503", "23505", "23514", "22023", "40001", "40P01"]) {
    const { calls, dependencies } = fixture({ provision: async () => ({ data: null, code }) });
    const result = await runProvisioning("new@example.invalid", dependencies);
    assert.equal(result.ok, false);
    assert.equal(result.needsReview, undefined);
    assert.deepEqual(calls.at(-1), ["delete", id]);
    assert.equal(JSON.stringify(result).includes(password), false);
  }
});

test("Cleanup failures are visible, actionable, and never include SDK details/password", async () => {
  for (const remove of [async () => false, async () => { throw new Error(password); }]) {
    const { dependencies } = fixture({ provision: async () => ({ data: null, code: "23505" }), remove });
    const result = await runProvisioning("new@example.invalid", dependencies);
    assert.equal(result.ok, false);
    assert.equal(result.needsReview, true);
    assert.ok(result.error.includes(id));
    assert.equal(JSON.stringify(result).includes(password), false);
  }
});

test("Ambiguous response with matching read-back returns the original one-time credentials without retrying", async () => {
  for (const provision of [async () => { throw new Error("transport"); }, async () => ({ data: null, code: "" })]) {
    let generated = 0;
    const { calls, dependencies } = fixture({ provision, password: () => { generated++; return password; }, reconcile: async (value) => { assert.equal(value, id); return "matched"; } });
    const result = await runProvisioning("new@example.invalid", dependencies);
    assert.deepEqual(result, { ok: true, email: "new@example.invalid", password });
    assert.equal(generated, 1);
    assert.deepEqual(calls, [["create", password]]);
  }
});

test("Empty read-back or failed reconciliation never deletes an identity or releases a password", async () => {
  for (const reconcile of [async () => "not_observed", async () => "inconclusive", async () => { throw new Error(password); }]) {
    const { calls, dependencies } = fixture({ provision: async () => { throw new Error("transport"); }, reconcile });
    const result = await runProvisioning("new@example.invalid", dependencies);
    assert.equal(result.needsReview, true);
    assert.equal("password" in result, false);
    assert.equal(JSON.stringify(result).includes(password), false);
    assert.equal(calls.some(([kind]) => kind === "delete"), false);
  }
});

test("Unknown RPC outcomes retain identity for reconciliation instead of orphaning a committed Organisation", async () => {
  for (const provision of [
    async () => { throw new Error(password); },
    async () => ({ data: null, code: "" }),
    async () => ({ data: null, code: "PGRST000" }),
    async () => ({ data: null, code: "08006" }),
    async () => ({ data: null, code: null }),
  ]) {
    const { calls, dependencies } = fixture({ provision });
    const result = await runProvisioning("new@example.invalid", dependencies);
    assert.equal(result.needsReview, true);
    assert.deepEqual(calls.at(-1), ["reconcile", id]);
    assert.equal(calls.some(([kind]) => kind === "delete"), false);
    assert.equal(JSON.stringify(result).includes(password), false);
  }
  assert.equal(isConfirmedRejection("network"), false);
});

test("Failed/uncertain Auth creation never provisions or deletes a pre-existing identity by email", async () => {
  for (const create of [async () => ({ error: true }), async () => { throw new Error(password); }]) {
    const { calls, dependencies } = fixture({ create });
    const result = await runProvisioning("existing@example.invalid", dependencies);
    assert.equal(result.needsReview, true);
    assert.deepEqual(calls, []);
    assert.equal(JSON.stringify(result).includes(password), false);
  }
});
