import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) => readFileSync(path.join(root, name), "utf8");
const key = "__worktrackAuthAdminSecurityTest";
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/lib/supabase/admin.ts")) {
      let source;
      if (specifier === "../env") source = 'export function requireAdminEnvironment(){return {SUPABASE_URL:"https://example.invalid",SUPABASE_SECRET_KEY:"sb_secret_offline_sentinel"};}';
      if (specifier === "@supabase/supabase-js") source = `export function createClient(url,key,options){const f=globalThis.${key}; f.config={url,key,options}; return {auth:{admin:{createUser:async input=>{f.created=input;return {data:{user:{id:"offline-id"}},error:null};},deleteUser:async id=>{f.deleted=id;return {error:null};}}}};}`;
      if (source) return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { createAuthAdministrator } = await import("../lib/supabase/admin.ts");
hooks.deregister();

test("Auth-only wrapper auto-confirms email, supplies no role metadata, and exposes no table client", async () => {
  const f = {};
  globalThis[key] = f;
  try {
    const administrator = createAuthAdministrator();
    assert.deepEqual(Object.keys(administrator).sort(), ["createUser", "deleteUser"]);
    await administrator.createUser("offline@example.invalid", "offline-password-sentinel");
    assert.deepEqual(f.created, { email: "offline@example.invalid", password: "offline-password-sentinel", email_confirm: true });
    await administrator.deleteUser("newly-created-offline-id");
    assert.equal(f.deleted, "newly-created-offline-id");
    assert.deepEqual(f.config.options.auth, { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
  } finally { delete globalThis[key]; }
});

test("Privileged key references are restricted to server-only runtime modules", () => {
  function files(dir) {
    return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const name = path.join(dir, entry.name);
      return entry.isDirectory() ? files(name) : /\.tsx?$/.test(name) ? [name] : [];
    });
  }
  const references = [];
  for (const name of [ ...files("app"), ...files("lib"), ...files("components"), "proxy.ts" ]) {
    const source = read(name);
    assert.doesNotMatch(source, /NEXT_PUBLIC_\w*(?:SECRET|SERVICE|PRIVILEGED)/);
    if (source.includes("SUPABASE_SECRET_KEY")) {
      references.push(name);
      assert.match(source, /import "server-only"/);
    }
  }
  assert.deepEqual(references.sort(), ["lib/env.ts", "lib/supabase/admin.ts"]);
});

test("Credential panel clears its in-memory result and never resubmits or persists the password", () => {
  const form = read("components/provisioning/account-form.tsx");
  assert.match(form, /function close\(\)\s*\{\s*setResult\(null\);\s*setOpen\(false\)/);
  assert.match(form, /result\?\.ok \?/);
  assert.match(form, /value=\{result\.password\}/);
  assert.match(form, /setResult\(await provisionAccount\(input\)\)/);
  assert.doesNotMatch(form, /useActionState|localStorage|sessionStorage|document\.cookie|console\.|JSON\.stringify/);
  const sources = [form, ...["actions", "workflow", "password", "reconciliation"].map((name) => read(`lib/provisioning/${name}.ts`)), read("lib/supabase/admin.ts")].join("\n");
  assert.doesNotMatch(sources, /console\.|localStorage|sessionStorage|writeFile|appendFile|cookies\(|URLSearchParams/);
  const actions = read("lib/provisioning/actions.ts");
  assert.doesNotMatch(actions, /\.(?:insert|update|upsert|delete)\(/);
  assert.doesNotMatch(read("lib/provisioning/reconciliation.ts"), /administrator|createAuthAdministrator|\.rpc\(/);
});

test("Foundation direct-write ACLs stay denied; provisioning migration adds function grants only", () => {
  const foundation = read("../supabase/migrations/20260921000100_identity_foundation.sql");
  const provisioning = read("../supabase/migrations/20260921000200_account_provisioning.sql");
  assert.match(foundation, /revoke all on table[\s\S]*?from public, anon, authenticated, service_role;/);
  assert.doesNotMatch(provisioning, /grant\s+(?:all|insert|update|delete|truncate|references|trigger|select)|disable row level security/i);
  assert.equal((provisioning.match(/grant execute on function/g) ?? []).length, 5);
});
