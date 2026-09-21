import "server-only";
import { redirect } from "next/navigation";
import { getEnvironment } from "../env";
import { createSupabaseServerClient } from "../supabase/server";
import { profileSchema } from "../validation/auth";
import { landingPath } from "./policy";

export async function readIdentity() {
  if (!getEnvironment()) return { kind: "unavailable" } as const;
  const client = await createSupabaseServerClient();
  try {
    const { data, error } = await client.auth.getUser();
    if (error) {
      if (error.name === "AuthSessionMissingError" || error.status === 401 || error.status === 403 || error.status === 400) return { kind: "anonymous" } as const;
      return { kind: "unavailable" } as const;
    }
    if (!data.user || data.user.is_anonymous) return { kind: "anonymous" } as const;
    const { data: row, error: profileError } = await client.from("profiles")
      .select("id, full_name, role, organisation_id").eq("id", data.user.id).maybeSingle();
    if (profileError) return { kind: "unavailable" } as const;
    const parsed = profileSchema.safeParse(row);
    if (!parsed.success || parsed.data.id !== data.user.id) return { kind: "denied" } as const;
    return { kind: "authenticated", profile: parsed.data, client } as const;
  } catch {
    return { kind: "unavailable" } as const;
  }
}

export async function requireIdentity(role?: "platform_owner" | "admin" | "customer") {
  const identity = await readIdentity();
  if (identity.kind === "anonymous") redirect("/login");
  if (identity.kind === "denied") redirect("/access-denied");
  if (identity.kind === "unavailable") throw new Error("Your workspace is temporarily unavailable. Please try again.");
  if (role && identity.profile.role !== role) redirect(landingPath(identity.profile.role));
  return identity;
}
