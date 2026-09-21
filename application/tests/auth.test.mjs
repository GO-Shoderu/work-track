import assert from "node:assert/strict";
import { test } from "node:test";
import { loginSchema, profileSchema } from "../lib/validation/auth.ts";
import { canAccessOrganisation, landingPath } from "../lib/auth/policy.ts";
import { getEnvironment, sessionCookieOptions } from "../lib/env.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const base = { id: A, full_name: "Test User" };

test("FR-008: profile validation rejects forged roles and invalid tenant combinations", () => {
  for (const role of ["owner", "superadmin", "", null]) {
    assert.equal(profileSchema.safeParse({ ...base, role, organisation_id: null }).success, false);
  }
  for (const role of ["platform_owner", "admin"]) {
    assert.equal(profileSchema.safeParse({ ...base, role, organisation_id: A }).success, false);
    assert.equal(profileSchema.safeParse({ ...base, role, organisation_id: null }).success, true);
  }
  assert.equal(profileSchema.safeParse({ ...base, role: "customer", organisation_id: null }).success, false);
  assert.equal(profileSchema.safeParse({ ...base, role: "customer", organisation_id: A }).success, true);
  assert.equal(profileSchema.safeParse(null).success, false);
});

test("QR-SEC-006: login validates email and preserves password whitespace", () => {
  assert.deepEqual(loginSchema.parse({ email: " user@example.com ", password: " pass " }), { email: "user@example.com", password: " pass " });
  for (const input of [{ email: "bad", password: "x" }, { email: "a@b.com", password: "" }, { email: "a@b.com", password: "x".repeat(4097) }, { email: "a@b.com", password: "x", role: "platform_owner" }]) {
    assert.equal(loginSchema.safeParse(input).success, false);
  }
});

test("FR-014: Customer cannot cross tenants even with an assignment flag", () => {
  const customer = { role: "customer", organisation_id: A };
  assert.equal(canAccessOrganisation(customer, A, false), true);
  assert.equal(canAccessOrganisation(customer, B, false), false);
  assert.equal(canAccessOrganisation(customer, B, true), false);
});

test("QR-SEC-007: delegated Admin requires a current verified assignment", () => {
  const admin = { role: "admin", organisation_id: null };
  assert.equal(canAccessOrganisation(admin, A, true), true);
  assert.equal(canAccessOrganisation(admin, A, false), false);
  assert.equal(canAccessOrganisation(admin, B, false), false);
});

test("Platform Owner scope and fixed role destinations", () => {
  assert.equal(canAccessOrganisation({ role: "platform_owner", organisation_id: null }, B, false), true);
  assert.equal(landingPath("platform_owner"), "/platform");
  assert.equal(landingPath("admin"), "/admin");
  assert.equal(landingPath("customer"), "/workspace");
  assert.equal(canAccessOrganisation({ role: "invented", organisation_id: A }, A, true), false);
});

test("QR-SEC-004: missing configuration and privileged keys fail closed", () => {
  const names = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "APP_URL"];
  const previous = Object.fromEntries(names.map((key) => [key, process.env[key]]));
  try {
    for (const key of names) delete process.env[key];
    assert.equal(getEnvironment(), null);
    process.env.SUPABASE_URL = "https://example.invalid";
    process.env.APP_URL = "http://127.0.0.1:3000";
    for (const key of ["sb_secret_not_a_real_key", "legacy-service-role-jwt", ""]) {
      process.env.SUPABASE_PUBLISHABLE_KEY = key;
      assert.equal(getEnvironment(), null);
    }
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_offline_placeholder";
    assert.ok(getEnvironment());
    process.env.APP_URL = "http://worktrack.example";
    assert.equal(getEnvironment(), null);
    process.env.APP_URL = "https://user:password@example.invalid";
    assert.equal(getEnvironment(), null);
  } finally {
    for (const key of names) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("Session cookies are HTTP-only, host-only and secure over HTTPS", () => {
  const production = sessionCookieOptions("https://worktrack.go-sh.dev");
  assert.equal(production.httpOnly, true);
  assert.equal(production.secure, true);
  assert.equal(production.sameSite, "lax");
  assert.equal(production.path, "/");
  assert.equal(production.domain, undefined);
  assert.equal(sessionCookieOptions("http://127.0.0.1:3000").secure, false);
});
