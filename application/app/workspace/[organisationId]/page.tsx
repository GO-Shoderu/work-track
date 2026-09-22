import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { requireOrganisationAccess } from "../../../lib/auth/authorization";
import { requireIdentity } from "../../../lib/auth/identity";
import { managementReturnPath } from "../../../lib/provisioning/policy";

export const dynamic = "force-dynamic";

export default async function ManagedWorkspacePage({ params }: { params: Promise<{ organisationId: string }> }) {
  const identity = await requireIdentity();
  // Customers never adopt a URL-selected organisation, even their own.
  if (identity.profile.role === "customer") redirect("/workspace");

  const { organisationId } = await params;
  const { profile, organisation } = await requireOrganisationAccess(organisationId);

  return (
    <WorkspaceShell
      title={organisation.name}
      name={profile.full_name}
      context={`Managing Customer Workspace: ${organisation.name}`}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d8ef78] bg-lime-subtle px-3 py-1.5 text-xs font-semibold text-[#405300]">
          <span className="size-2 rounded-full bg-lime-hover" />
          Managing customer workspace
        </div>
        <Link
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold transition hover:bg-subtle"
          href={managementReturnPath(profile.role)}
        >
          Return to administration
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
        <div className="p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Recruitment</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">Customer hiring workspace</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            You are operating inside {organisation.name}. Recruitment records are scoped to this organisation by server authorization and database RLS.
          </p>
        </div>

        <div className="grid border-t border-border md:grid-cols-3">
          {[
            ["Pipeline", "Track candidates through the hiring stages."],
            ["Jobs", "Create and manage open roles."],
            ["Candidates", "Maintain candidate profiles and applications."],
          ].map(([label, description]) => (
            <div key={label} className="border-b border-border p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <span className="flex size-9 items-center justify-center rounded-xl bg-subtle text-sm font-bold">{label.charAt(0)}</span>
              <h3 className="mt-4 text-sm font-semibold">{label}</h3>
              <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
