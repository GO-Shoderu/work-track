import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { ProvisioningInput } from "../validation/provisioning";
import { profileSchema } from "../validation/auth";

export type ReconciliationResult = "matched" | "not_observed" | "inconclusive";

// Always receives the actor's ordinary session client, never the Auth admin
// client. An empty SELECT is not proof of rollback: RLS may hide the row, and
// an in-flight RPC may commit after this SELECT's snapshot.
export async function reconcileProvisioning(
  client: SupabaseClient<Database>,
  actorId: string,
  targetId: string,
  request: ProvisioningInput,
): Promise<ReconciliationResult> {
  try {
    const target = await client.from("profiles")
      .select("id, full_name, role, organisation_id").eq("id", targetId).maybeSingle();
    if (target.error) return "inconclusive";
    if (target.data === null) return "not_observed";
    const parsed = profileSchema.safeParse(target.data);
    if (!parsed.success || parsed.data.id !== targetId || parsed.data.full_name !== request.fullName) return "inconclusive";
    const profile = parsed.data;
    if (request.kind === "admin" ? profile.role !== "admin" : profile.role !== "customer") return "inconclusive";
    if (request.kind === "customer" && profile.organisation_id !== request.organisationId) return "inconclusive";

    // Recheck current actor authority rather than relying on the pre-RPC role.
    const actor = await client.from("profiles")
      .select("id, full_name, role, organisation_id").eq("id", actorId).maybeSingle();
    const trustedActor = profileSchema.safeParse(actor.data);
    if (actor.error || !trustedActor.success || trustedActor.data.id !== actorId) return "inconclusive";
    if (trustedActor.data.role !== "platform_owner") {
      if (trustedActor.data.role !== "admin" || request.kind !== "customer") return "inconclusive";
      const assignment = await client.from("admin_organisation_assignments")
        .select("admin_id, organisation_id").eq("admin_id", actorId)
        .eq("organisation_id", request.organisationId).maybeSingle();
      if (assignment.error || assignment.data?.admin_id !== actorId || assignment.data.organisation_id !== request.organisationId) return "inconclusive";
    }

    if (profile.role === "customer") {
      const organisation = await client.from("organisations").select("id, name")
        .eq("id", profile.organisation_id).maybeSingle();
      if (organisation.error || organisation.data?.id !== profile.organisation_id) return "inconclusive";
      if (request.kind === "organisation" && organisation.data.name !== request.organisationName) return "inconclusive";
    }
    return "matched";
  } catch { return "inconclusive"; }
}
