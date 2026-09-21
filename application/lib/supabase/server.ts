import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnvironment, sessionCookieOptions } from "../env";
import type { Database } from "./database.types";

export async function createSupabaseServerClient(writable = false) {
  const env = requireEnvironment();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: sessionCookieOptions(env.APP_URL),
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(10000) }) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        // Proxy owns refresh during rendering. Server Actions can write cookies.
        if (writable) values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
