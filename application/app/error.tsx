"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center p-6"><section className="max-w-md rounded-xl border border-border bg-surface p-8"><h1 className="text-xl font-semibold">Workspace temporarily unavailable</h1><p role="alert" className="my-4 text-sm text-muted">We couldn’t load your workspace. Please try again.</p><button onClick={reset} className="rounded-lg bg-lime px-4 py-2 text-sm font-semibold">Try again</button><Link href="/login" className="ml-4 text-sm underline">Return to sign in</Link></section></main>;
}
