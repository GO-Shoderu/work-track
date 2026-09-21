import { WorkspaceShell } from "../../components/workspace-shell";
import { requireIdentity } from "../../lib/auth/identity";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const { profile, client } = await requireIdentity("admin");
  // RLS checks assignments in the database, not a browser-supplied filter.
  const { data, error } = await client.from("organisations").select("id, name").order("name").limit(100);
  if (error) throw new Error("Organisations are temporarily unavailable.");
  return <WorkspaceShell title="My Organisations" name={profile.full_name} context="Delegated Admin"><section className="rounded-xl border border-border bg-surface p-6"><h2 className="font-semibold">Assigned organisations</h2>{data.length ? <ul className="mt-4 divide-y divide-border">{data.map((org) => <li key={org.id} className="py-3 text-sm">{org.name}</li>)}</ul> : <p className="mt-3 text-sm text-muted">You have no organisation assignments. Contact your Platform Owner.</p>}{data.length === 100 && <p className="mt-3 text-sm text-muted">Showing the first 100 assigned organisations.</p>}</section></WorkspaceShell>;
}
