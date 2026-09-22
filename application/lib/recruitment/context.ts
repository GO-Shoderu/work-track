import "server-only";
import { notFound } from "next/navigation";
import { requireIdentity } from "../auth/identity";
import { requireOrganisationAccess } from "../auth/authorization";

export async function recruitmentContext(requestedId?: string) {
  const { profile } = await requireIdentity();
  if (profile.role === "customer") {
    if (requestedId && requestedId !== profile.organisation_id) notFound();
    // Customer scope comes from the verified profile, never the input.
    return requireOrganisationAccess(profile.organisation_id!);
  }
  return requireOrganisationAccess(requestedId);
}
