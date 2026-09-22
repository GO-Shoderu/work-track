import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { LogoutButton } from "./auth/logout-button";

function homeHref(context: string) {
  if (context === "Platform Owner") return "/platform";
  if (context === "Delegated Admin") return "/admin";
  return "/workspace";
}

function roleLabel(context: string) {
  if (context.startsWith("Managing Customer Workspace:")) return "Managing workspace";
  return context;
}

export function WorkspaceShell({
  title,
  name,
  context,
  children,
}: {
  title: string;
  name: string;
  context: string;
  children: ReactNode;
}) {
  const href = homeHref(context);

  return (
    <div className="min-h-screen bg-workspace lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-sidebar text-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[17rem] lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5 lg:px-6 lg:py-7">
          <Brand />
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-300 lg:hidden">
            {roleLabel(context)}
          </span>
        </div>

        <div className="hidden px-4 lg:block">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            Workspace
          </p>
          <nav className="mt-3">
            <Link
              href={href}
              className="flex items-center gap-3 rounded-xl bg-white/[0.08] px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
            >
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-lime text-sidebar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                  <path d="M4 5h16M4 12h16M4 19h10" strokeLinecap="round" />
                </svg>
              </span>
              Overview
            </Link>
          </nav>
        </div>

        <div className="hidden px-6 pt-8 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Access</p>
            <p className="mt-2 text-sm font-medium text-gray-200">{roleLabel(context)}</p>
          </div>
        </div>

        <div className="hidden mt-auto border-t border-white/10 p-4 lg:block">
          <div className="rounded-2xl bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lime text-sm font-bold text-sidebar">
                {name.trim().charAt(0).toUpperCase() || "W"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{name}</p>
                <p className="mt-0.5 truncate text-xs text-gray-400">{roleLabel(context)}</p>
              </div>
            </div>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 lg:col-start-2">
        <div className="mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-7 lg:px-10 lg:py-10 xl:px-12">
          <header className="mb-8 flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{roleLabel(context)}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-sidebar sm:text-3xl">{title}</h1>
            </div>
            <div className="lg:hidden">
              <LogoutButton />
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
