"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { provisionAccount } from "../../lib/provisioning/actions";
import type { ProvisioningResult } from "../../lib/provisioning/workflow";

type Props = { kind: "organisation" | "admin" } | { kind: "customer"; organisationId: string };
const fieldClass = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm";

export function AccountForm(props: Props) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ProvisioningResult | null>(null);
  const label = props.kind === "organisation" ? "New Organisation / Customer" : props.kind === "admin" ? "New Admin" : "Add Customer";

  function close() {
    setResult(null);
    setOpen(false);
    router.refresh();
  }

  return <div className="mt-4">
    {!open ? <button type="button" onClick={() => { setResult(null); setOpen(true); }} className="rounded-lg bg-lime hover:bg-lime-hover px-4 py-2 text-sm font-semibold">{label}</button> :
      <div className="max-w-lg rounded-xl border border-border bg-subtle p-4">
        <h3 className="font-semibold">{label}</h3>
        {result?.ok ? <div className="mt-3 space-y-3">
          <p role="status" className="text-sm">Account created. Save these credentials privately now. The password will not be shown again after closing this panel.</p>
          <p className="break-all text-sm">Email: {result.email}</p>
          <label className="block text-sm" htmlFor={`${id}-temporary`}>Temporary password</label>
          <input id={`${id}-temporary`} readOnly autoComplete="off" value={result.password} className={fieldClass} />
          <button type="button" onClick={close} className="rounded-lg bg-lime hover:bg-lime-hover px-4 py-2 text-sm font-semibold">I have saved the credentials</button>
        </div> : <form className="mt-3 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const form = new FormData(event.currentTarget);
          setResult(null);
          startTransition(async () => {
            try {
              const input = { kind: props.kind, fullName: form.get("fullName"), email: form.get("email"),
                ...(props.kind === "organisation" ? { organisationName: form.get("organisationName") } : {}),
                ...(props.kind === "customer" ? { organisationId: props.organisationId } : {}) };
              // No previous action state: a displayed password is never sent back.
              setResult(await provisionAccount(input));
            } catch {
              setResult({ ok: false, error: "The result could not be confirmed. Ask the Platform Owner to check the account before retrying.", needsReview: true });
            }
          });
        }}>
          <fieldset disabled={pending || result?.needsReview} className="space-y-3 disabled:opacity-60">
            {props.kind === "organisation" && <label className="block text-sm" htmlFor={`${id}-org`}>Organisation name<input id={`${id}-org`} name="organisationName" required maxLength={200} className={fieldClass} /></label>}
            <label className="block text-sm" htmlFor={`${id}-name`}>Full name<input id={`${id}-name`} name="fullName" required maxLength={200} autoComplete="off" className={fieldClass} /></label>
            <label className="block text-sm" htmlFor={`${id}-email`}>Email<input id={`${id}-email`} name="email" type="email" required maxLength={254} autoComplete="off" className={fieldClass} /></label>
            <button className="rounded-lg bg-lime hover:bg-lime-hover px-4 py-2 text-sm font-semibold" type="submit">{pending ? "Creating account…" : "Create account"}</button>
          </fieldset>
          {result && <p role="alert" className="text-sm text-red-700">{result.error}</p>}
          <button type="button" disabled={pending} onClick={close} className="text-sm underline disabled:opacity-50">Close</button>
        </form>}
      </div>}
  </div>;
}
