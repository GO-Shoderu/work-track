import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireAdminEnvironment } from "../env";

// Expose only Auth administration, never a privileged database client.
export function createAuthAdministrator() {
  const env = requireAdminEnvironment();
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(15_000) }) },
  });
  return {
    createUser: (email: string, password: string) => client.auth.admin.createUser({ email, password, email_confirm: true }),
    deleteUser: (id: string) => client.auth.admin.deleteUser(id),
  };
}
