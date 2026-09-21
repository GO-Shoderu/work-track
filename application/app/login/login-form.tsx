"use client";
import { useActionState } from "react";
import { login } from "../../lib/auth/actions";
export function LoginForm({ available }: { available: boolean }) {
  const [state, action, pending] = useActionState(login, { error: "" });
  return <form action={action} className="mt-6 space-y-4" aria-busy={pending}>
    <div><label htmlFor="email" className="mb-1 block text-xs font-medium">Email</label><input id="email" name="email" type="email" autoComplete="username" placeholder="you@organisation.com" required maxLength={254} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm" /></div>
    <div><label htmlFor="password" className="mb-1 block text-xs font-medium">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={4096} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm" /></div>
    {(!available || state.error) && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{available ? state.error : "Sign-in is temporarily unavailable. Please try again later."}</p>}
    <button disabled={pending || !available} className="h-10 w-full rounded-lg bg-lime text-sm font-semibold text-sidebar hover:bg-lime-hover disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}
