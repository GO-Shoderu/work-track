"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getEnvironment, sessionCookieOptions } from "../env";
import { createSupabaseServerClient } from "../supabase/server";
import { loginSchema, profileSchema } from "../validation/auth";
import { landingPath } from "./policy";

type ActionState = { error: string };

async function validOrigin() {
  const env = getEnvironment();
  const incoming = await headers();
  // Additional fixed-origin check; retains the framework's own CSRF protection.
  return env && incoming.get("origin") === new URL(env.APP_URL).origin;
}

export async function login(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await validOrigin())) return { error: "Sign-in is temporarily unavailable. Please try again." };
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email address and password." };
  let destination: string;
  try {
    const client = await createSupabaseServerClient(true);
    const { data, error } = await client.auth.signInWithPassword(parsed.data);
    if (error || !data.user) return { error: "Unable to sign in. Check your credentials and try again." };
    const { data: row, error: profileError } = await client.from("profiles")
      .select("id, full_name, role, organisation_id").eq("id", data.user.id).maybeSingle();
    if (profileError) return { error: "Your workspace is temporarily unavailable. Please try again." };
    const profile = profileSchema.safeParse(row);
    destination = !data.user.is_anonymous && profile.success && profile.data.id === data.user.id
      ? landingPath(profile.data.role) : "/access-denied";
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again." };
  }
  redirect(destination);
}

export async function logout(): Promise<ActionState> {
  if (!(await validOrigin())) return { error: "Unable to sign out. Please try again." };
  try {
    const client = await createSupabaseServerClient(true);
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return { error: "Unable to sign out. Please try again." };
    const store = await cookies();
    const env = getEnvironment()!;
    // Also removes stale chunked cookies after a successful sign-out.
    for (const cookie of store.getAll()) {
      if (cookie.name === "worktrack-auth" || cookie.name.startsWith("worktrack-auth.")) {
        store.set(cookie.name, "", { ...sessionCookieOptions(env.APP_URL), maxAge: 0 });
      }
    }
  } catch {
    return { error: "Unable to sign out. Please try again." };
  }
  redirect("/login");
}
