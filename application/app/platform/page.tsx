import { WorkspaceShell } from "../../components/workspace-shell";
import { requireIdentity } from "../../lib/auth/identity";
export const dynamic = "force-dynamic";
export default async function PlatformPage() {
  const { profile, client } = await requireIdentity("platform_owner");
  const { data, error } = await client.from("organisations").select("id, name").order("name").limit(100);
  if (error) throw new Error("Organisations are temporarily unavailable.");
  return <WorkspaceShell title="Platform Administration" name={profile.full_name} context="Platform Owner"><section className="rounded-xl border border-border bg-surface p-6"><h2 className="font-semibold">Organisations</h2>{data.length ? <ul className="mt-4 divide-y divide-border">{data.map((org) => <li key={org.id} className="py-3 text-sm">{org.name}</li>)}</ul> : <p className="mt-3 text-sm text-muted">No organisations yet.</p>}{data.length === 100 && <p className="mt-3 text-sm text-muted">Showing the first 100 organisations.</p>}<p className="mt-5 border-t border-border pt-4 text-sm text-muted">Account provisioning will be available in a later milestone.</p></section></WorkspaceShell>;
}
