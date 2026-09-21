import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnvironment, sessionCookieOptions } from "../env";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const noCache = () => {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  };
  noCache();
  const env = getEnvironment();
  if (!env) return response; // No remote client is created in disconnected mode.
  const client = createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: sessionCookieOptions(env.APP_URL),
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(10000) }) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, headers) => {
        const previous = response.cookies.getAll();
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        previous.forEach((cookie) => response.cookies.set(cookie));
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        noCache();
      },
    },
  });
  try {
    await client.auth.getClaims();
  } catch {
    // Pages independently verify with getUser() and fail closed. Never log tokens.
  }
  return response;
}
