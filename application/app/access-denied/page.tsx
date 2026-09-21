import { redirect } from "next/navigation";
import { LogoutButton } from "../../components/auth/logout-button";
import { readIdentity } from "../../lib/auth/identity";
import { landingPath } from "../../lib/auth/policy";
export const dynamic = "force-dynamic";
export default async function AccessDeniedPage() {
  const identity = await readIdentity();
  if (identity.kind === "anonymous") redirect("/login");
  if (identity.kind === "authenticated") redirect(landingPath(identity.profile.role));
  if (identity.kind === "unavailable") throw new Error("Your workspace is temporarily unavailable.");
  return <main className="flex min-h-screen items-center justify-center p-6"><section className="w-full max-w-md rounded-xl border border-border bg-surface p-8"><h1 className="text-xl font-semibold">Workspace access unavailable</h1><p className="my-4 text-sm text-muted">Your account does not have access to a Work Track workspace. Contact your administrator.</p><LogoutButton /></section></main>;
}
