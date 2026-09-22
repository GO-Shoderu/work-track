import "server-only";
import type { ReconciliationResult } from "./reconciliation";

export type ProvisioningResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string; needsReview?: boolean };

type Dependencies = {
  password: () => string;
  create: (password: string) => Promise<{ id?: string; error: boolean }>;
  provision: (id: string) => Promise<{ data: string | null; code: string | null }>;
  reconcile: (id: string) => Promise<ReconciliationResult>;
  remove: (id: string) => Promise<boolean>;
};

function reviewRequired(id?: string): ProvisioningResult {
  return { ok: false, needsReview: true, error: "Account creation needs Platform Owner review. Do not retry before checking Auth and application records." + (id ? ` Reference: ${id}.` : " Check the submitted email in trusted Auth administration.") };
}

// Only explicit PostgreSQL rejections establish that the RPC transaction failed.
// Gateway errors, timeouts, malformed responses and lost connections are NOT
// proof of rollback. Blind deletion after a committed RPC could orphan an org.
export function isConfirmedRejection(code: string | null) {
  return code !== null && /^(22|23|40|42|P0)[A-Z0-9]{3}$/.test(code);
}

export async function runProvisioning(email: string, dependencies: Dependencies): Promise<ProvisioningResult> {
  let password: string;
  let id: string | undefined;
  try {
    password = dependencies.password();
    const created = await dependencies.create(password);
    id = created.id;
    // An Auth failure without an ID cannot safely be compensated by email:
    // that email may belong to a pre-existing user. Never delete by lookup.
    if (created.error || !id) return reviewRequired(id);
  } catch { return reviewRequired(id); }

  let rejected = false;
  try {
    const response = await dependencies.provision(id);
    if (!response.code && response.data) return { ok: true, email, password };
    rejected = isConfirmedRejection(response.code);
  } catch { /* Attempt a user-session read-back before falling back to review. */ }

  if (!rejected) {
    try {
      if (await dependencies.reconcile(id) === "matched") return { ok: true, email, password };
    } catch { /* A failed read cannot authorise deletion. */ }
    // Even a successful empty read cannot establish that an in-flight RPC has
    // finished. No finite delay or repeated empty SELECT supplies that proof.
    return reviewRequired(id);
  }

  // A confirmed database rejection rolls back the entire RPC, including a new
  // Organisation. Delete only the Auth UUID returned by this create operation.
  try {
    if (await dependencies.remove(id)) return { ok: false, error: "Account creation failed. The new Auth identity was removed. Refresh, check your access and try again." };
  } catch { /* Report a safe actionable cleanup failure, never the SDK error. */ }
  return reviewRequired(id);
}
