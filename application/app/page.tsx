import { redirect } from "next/navigation";
import { readIdentity } from "../lib/auth/identity";
import { landingPath } from "../lib/auth/policy";
export const dynamic = "force-dynamic";
export default async function Home() {
  const identity = await readIdentity();
  if (identity.kind === "authenticated") redirect(landingPath(identity.profile.role));
  if (identity.kind === "denied") redirect("/access-denied");
  redirect("/login");
}
