import { WorkspaceShell } from "../../components/workspace-shell";
import { requireOrganisationAccess } from "../../lib/auth/authorization";
import { requireIdentity } from "../../lib/auth/identity";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  await requireIdentity("customer");
  const { profile, organisation } = await requireOrganisationAccess();

  return (
    <WorkspaceShell title={organisation.name} name={profile.full_name} context="Customer workspace">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(13_15_20/0.03)]">
        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-8">
          <div>
            <span className="inline-flex rounded-full bg-lime-subtle px-3 py-1 text-xs font-semibold text-[#405300]">
              Recruitment workspace
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Welcome back, {profile.full_name}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Manage roles, candidates, and hiring progress for {organisation.name} from one focused workspace.
            </p>
          </div>

          <div className="rounded-2xl bg-sidebar p-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Workspace status</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="size-2.5 rounded-full bg-lime" />
              <p className="text-sm font-semibold">Access active</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-400">
              Your account is securely scoped to this organisation.
            </p>
          </div>
        </div>

        <div className="grid border-t border-border sm:grid-cols-3">
          {["Pipeline", "Jobs", "Candidates"].map((label) => (
            <div key={label} className="border-b border-border px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-2 text-sm text-muted">Recruitment data will appear here as the ATS core is connected.</p>
            </div>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}
