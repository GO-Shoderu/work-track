import assert from "node:assert/strict";
import { test } from "node:test";
import { provisioningSchema, assignmentSchema } from "../lib/validation/provisioning.ts";
import { mayProvision, managementReturnPath } from "../lib/provisioning/policy.ts";
import { generateTemporaryPassword } from "../lib/provisioning/password.ts";
import { requireAdminEnvironment, getEnvironment } from "../lib/env.ts";

const org = "11111111-1111-4111-8111-111111111111";
const account = { email: "new@example.invalid", fullName: "New User" };

test("FR-003/004/005: only trusted Owner or assigned Admin may provision", () => {
  for (const kind of ["organisation", "admin", "customer"]) {
    assert.equal(mayProvision("platform_owner", kind, false), true);
    assert.equal(mayProvision("customer", kind, true), false);
    assert.equal(mayProvision("invented", kind, true), false);
    assert.equal(mayProvision("admin", kind, false), false);
    assert.equal(mayProvision("admin", kind, true), kind === "customer");
  }
  assert.equal(mayProvision("platform_owner", "platform_owner", true), false);
});

test("QR-SEC-006: provisioning validates bounded names, emails, UUIDs and exact account types", () => {
  assert.ok(provisioningSchema.safeParse({ kind: "admin", ...account }).success);
  assert.ok(provisioningSchema.safeParse({ kind: "organisation", ...account, organisationName: "Acme" }).success);
  assert.equal(provisioningSchema.parse({ kind: "customer", ...account, fullName: " New User ", organisationId: org }).fullName, "New User");
  for (const input of [
    { kind: "platform_owner", ...account },
    { kind: "admin", ...account, role: "platform_owner" },
    { kind: "customer", ...account },
    { kind: "customer", ...account, organisationId: "../../platform" },
    { kind: "admin", ...account, fullName: " " },
    { kind: "admin", ...account, fullName: "a".repeat(201) },
    { kind: "admin", ...account, email: "invalid" },
    { kind: "organisation", ...account, organisationName: " " },
    { kind: "admin", ...account, targetAuthUserId: org },
    { kind: "admin", ...account, password: "browser-supplied" },
  ]) assert.equal(provisioningSchema.safeParse(input).success, false);
  assert.ok(assignmentSchema.safeParse({ adminId: org, organisationId: org, assign: true }).success);
  assert.equal(assignmentSchema.safeParse({ adminId: org, organisationId: org, assign: "true" }).success, false);
});

test("Temporary passwords have 192 random bits and common required categories", () => {
  const samples = new Set(Array.from({ length: 100 }, generateTemporaryPassword));
  assert.equal(samples.size, 100);
  for (const password of samples) assert.match(password, /^Aa1![A-Za-z0-9_-]{32}$/);
});

test("FR-012: management returns to the actor's own administration; Customer stays in own workspace", () => {
  assert.equal(managementReturnPath("platform_owner"), "/platform");
  assert.equal(managementReturnPath("admin"), "/admin");
  assert.equal(managementReturnPath("customer"), "/workspace");
});

test("QR-SEC-004: Auth admin config accepts only new server secret and leaves login independent", () => {
  const keys = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "APP_URL", "SUPABASE_SECRET_KEY"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.SUPABASE_URL = "https://example.invalid";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_offline_placeholder";
    process.env.APP_URL = "http://localhost:3000";
    for (const secret of ["", "legacy-service-role-jwt", "sb_publishable_wrong"] ) {
      process.env.SUPABASE_SECRET_KEY = secret;
      assert.ok(getEnvironment());
      assert.throws(requireAdminEnvironment, /provisioning is unavailable/);
    }
    process.env.SUPABASE_SECRET_KEY = "sb_secret_offline_placeholder";
    assert.ok(requireAdminEnvironment());
    assert.equal("SUPABASE_SECRET_KEY" in getEnvironment(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
