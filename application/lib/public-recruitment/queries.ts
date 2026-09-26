import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnvironment } from "../env";
import type { Database } from "../supabase/database.types";
import { careersInput, careersResult, publicJobInput, publicJobResult } from "./contracts";

// Stateless public-key client: these reads never inherit a user's session or privilege.
function reader() {
  const env = requireEnvironment();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) }) },
  });
}
export async function getOrganisationCareers(input: unknown) {
  const value = careersInput.parse(input);
  const { data, error } = await reader().rpc("read_public_careers", {
    target_slug: value.careersSlug, page_offset: value.offset, page_size: value.limit,
  });
  if (error) throw new Error("Careers information is unavailable.");
  return data === null ? null : careersResult.parse(data);
}
export async function getPublicJob(input: unknown) {
  const value = publicJobInput.parse(input);
  const { data, error } = await reader().rpc("read_public_job", {
    target_slug: value.careersSlug, target_public_id: value.publicId,
  });
  if (error) throw new Error("Job information is unavailable.");
  return data === null ? null : publicJobResult.parse(data);
}
