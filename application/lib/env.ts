import "server-only";
import { z } from "zod";

const environmentSchema = z.object({
  SUPABASE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  }),
  // Only the new publishable key format is accepted. Privileged keys fail closed.
  SUPABASE_PUBLISHABLE_KEY: z.string().regex(/^sb_publishable_[A-Za-z0-9_-]+$/),
  APP_URL: z.url().refine((value) => {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return (url.protocol === "https:" || (local && url.protocol === "http:")) &&
      !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  }),
});

export function getEnvironment() {
  const result = environmentSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    APP_URL: process.env.APP_URL,
  });
  return result.success ? result.data : null;
}

export function requireEnvironment() {
  const environment = getEnvironment();
  if (!environment) throw new Error("Sign-in is temporarily unavailable.");
  return environment;
}

export function sessionCookieOptions(appUrl: string) {
  return { name: "worktrack-auth", httpOnly: true, secure: new URL(appUrl).protocol === "https:", sameSite: "lax" as const, path: "/" };
}
