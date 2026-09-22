"use server";

import { headers } from "next/headers";
import { getEnvironment } from "../env";
import { readIdentity } from "../auth/identity";
import { createAuthAdministrator } from "../supabase/admin";
import { assignmentSchema, provisioningSchema } from "../validation/provisioning";
import { mayProvision } from "./policy";
import { runProvisioning, type ProvisioningResult } from "./workflow";
import { generateTemporaryPassword } from "./password";
import { reconcileProvisioning } from "./reconciliation";

async function validOrigin() {
  const env = getEnvironment();
  return !!env && (await headers()).get("origin") === new URL(env.APP_URL).origin;
}

export async function provisionAccount(input: unknown): Promise<ProvisioningResult> {
  const denied = { ok: false, error: "You are not authorised to create this account." } as const;
  if (!(await validOrigin())) return denied;
  const identity = await readIdentity();
  if (identity.kind !== "authenticated" || identity.profile.role === "customer") return denied;
  const parsed = provisioningSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid name, email and Organisation." };
  const request = parsed.data;
  const { profile, client } = identity;
  try {
    let assigned = false;
    if (request.kind === "customer") {
      if (profile.role === "admin") {
        const assignment = await client.from("admin_organisation_assignments").select("organisation_id")
          .eq("admin_id", profile.id).eq("organisation_id", request.organisationId).maybeSingle();
        if (assignment.error) return { ok: false, error: "Unable to verify access. Please try again." };
        assigned = assignment.data !== null;
      }
      if (!mayProvision(profile.role, request.kind, assigned)) return denied;
      const organisation = await client.from("organisations").select("id").eq("id", request.organisationId).maybeSingle();
      if (organisation.error || !organisation.data) return denied;
    }
    if (!mayProvision(profile.role, request.kind, assigned)) return denied;
    // No privileged client is constructed until actor, input, and scope pass.
    const administrator = createAuthAdministrator();
    return await runProvisioning(request.email, {
      password: generateTemporaryPassword,
      create: async (password) => {
        const { data, error } = await administrator.createUser(request.email, password);
        return { id: data.user?.id, error: !!error };
      },
      provision: async (id) => {
        // These calls deliberately use the ACTOR'S user-session client.
        const response = request.kind === "organisation"
          ? await client.rpc("provision_customer_organisation", { target_auth_user_id: id, organisation_name: request.organisationName, customer_full_name: request.fullName })
          : request.kind === "customer"
            ? await client.rpc("provision_customer_for_organisation", { target_auth_user_id: id, organisation_id: request.organisationId, customer_full_name: request.fullName })
            : await client.rpc("provision_admin", { target_auth_user_id: id, admin_full_name: request.fullName });
        return { data: response.data, code: response.error?.code ?? null };
      },
      reconcile: (id) => reconcileProvisioning(client, profile.id, id, request),
      remove: async (id) => !(await administrator.deleteUser(id)).error,
    });
  } catch {
    // Workflow owns all errors after Auth creation; configuration/read failures
    // reach here without having created any identity.
    return { ok: false, error: "Account provisioning is temporarily unavailable." };
  }
}

export async function changeAssignment(input: unknown): Promise<{ error?: string }> {
  if (!(await validOrigin())) return { error: "Unable to update assignment." };
  const identity = await readIdentity();
  if (identity.kind !== "authenticated" || identity.profile.role !== "platform_owner") return { error: "Only the Platform Owner can change assignments." };
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { error: "Select a valid Admin and Organisation." };
  try {
    const { adminId, organisationId, assign } = parsed.data;
    const { error } = await identity.client.rpc(assign ? "assign_admin_to_organisation" : "unassign_admin_from_organisation", { admin_id: adminId, organisation_id: organisationId });
    if (error) return { error: "Unable to confirm assignment. Refresh and check before retrying." };
    return {};
  } catch { return { error: "Unable to confirm assignment. Refresh and check before retrying." }; }
}
