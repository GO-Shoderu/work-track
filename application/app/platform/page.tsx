import { WorkspaceShell } from "../../components/workspace-shell";
import { requireIdentity } from "../../lib/auth/identity";
import Link from "next/link";
import { AccountForm } from "../../components/provisioning/account-form";
export const dynamic = "force-dynamic";
export default async function PlatformPage() {
  const { profile, client } = await requireIdentity("platform_owner");
  const { data, error } = await client.from("organisations").select("id, name").order("name").limit(100);
  if (error) throw new Error("Organisations are temporarily unavailable.");
  const { data: admins, error: adminError } = await client.from("profiles").select("id, full_name").eq("role", "admin").order("full_name").limit(100);
  if (adminError) throw new Error("Admins are temporarily unavailable.");
  return <WorkspaceShell title="Platform Administration" name={profile.full_name} context="Platform Owner">
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold">Organisations</h2>
        <AccountForm kind="organisation" />
        {data.length ? <ul className="mt-4 divide-y divide-border">{data.map((org) => <li key={org.id} className="py-3 text-sm"><Link className="font-medium underline" href={`/platform/organisations/${org.id}`}>{org.name}</Link></li>)}</ul> : <p className="mt-3 text-sm text-muted">No organisations yet.</p>}
        {data.length === 100 && <p className="mt-3 text-sm text-muted">Showing the first 100 organisations.</p>}
      </section>
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold">Admins</h2><AccountForm kind="admin" />
        <ul className="mt-4 divide-y divide-border">{admins.map((admin) => <li key={admin.id} className="py-3 text-sm">{admin.full_name}<span className="ml-3 text-xs text-muted">{admin.id.slice(0, 8)}</span></li>)}</ul>
        {!admins.length && <p className="mt-3 text-sm text-muted">No delegated Admins yet.</p>}
        {admins.length === 100 && <p className="text-sm text-muted">Showing the first 100 Admins.</p>}
      </section>
    </div>
  </WorkspaceShell>;
}
