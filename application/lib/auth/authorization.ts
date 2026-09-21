import "server-only";
import { notFound } from "next/navigation";
import { organisationIdSchema } from "../validation/auth";
import { requireIdentity } from "./identity";
import { canAccessOrganisation } from "./policy";

// Future tenant operations must call this at their own trusted entry point.
// It re-reads identity/assignments and retains user-session RLS on every query.
export async function requireOrganisationAccess(requestedId?: string) {
  const identity = await requireIdentity();
  const { profile, client } = identity;
  const id = requestedId ?? profile.organisation_id;
  const parsed = organisationIdSchema.safeParse(id);
  if (!parsed.success) notFound();
  let assigned = false;
  if (profile.role === "admin") {
    const { data, error } = await client.from("admin_organisation_assignments")
      .select("organisation_id").eq("admin_id", profile.id).eq("organisation_id", parsed.data).maybeSingle();
    if (error) throw new Error("Your workspace is temporarily unavailable.");
    assigned = data !== null;
  }
  if (!canAccessOrganisation(profile, parsed.data, assigned)) notFound();
  const { data: organisation, error } = await client.from("organisations")
    .select("id, name").eq("id", parsed.data).maybeSingle();
  if (error) throw new Error("Your workspace is temporarily unavailable.");
  if (!organisation) notFound();
  return { ...identity, organisation };
}
