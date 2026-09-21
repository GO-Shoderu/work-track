"use client";
import { useActionState } from "react";
import { logout } from "../../lib/auth/actions";
export function LogoutButton() {
  const [state, action, pending] = useActionState(logout, { error: "" });
  return <form action={action}><button className="rounded-lg border border-current/30 px-4 py-2 text-sm font-medium disabled:opacity-60" disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>{state.error && <p role="alert" className="mt-2 text-sm">{state.error}</p>}</form>;
}
