// Pure decisions tested offline; callers must supply a server-verified profile.
type Role = "platform_owner" | "admin" | "customer";
export function landingPath(role: Role) {
  switch (role) {
    case "platform_owner": return "/platform";
    case "admin": return "/admin";
    case "customer": return "/workspace";
  }
}

export function canAccessOrganisation(
  profile: { role: Role; organisation_id: string | null },
  organisationId: string,
  hasVerifiedAssignment: boolean,
) {
  switch (profile.role) {
    case "platform_owner": return true;
    case "admin": return hasVerifiedAssignment;
    case "customer": return profile.organisation_id === organisationId;
    default: return false;
  }
}
