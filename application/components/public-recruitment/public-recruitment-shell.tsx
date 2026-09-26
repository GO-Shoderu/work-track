import Link from "next/link";
import type { ReactNode } from "react";

export function PublicRecruitmentShell({
  children,
  organisationName,
  careersHref,
}: {
  children: ReactNode;
  organisationName: string;
  careersHref?: string;
}) {
  return (
    <main className="min-h-screen bg-workspace">
      <header className="border-b border-border bg-sidebar text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href={careersHref ?? "#"} className="inline-flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-xl bg-lime text-sm font-black text-sidebar">
              W
            </span>
            <span>
              <span className="block text-sm font-semibold">Work Track</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-white/55">
                Careers
              </span>
            </span>
          </Link>
          <span className="max-w-[50%] truncate text-xs font-medium text-white/70">
            {organisationName}
          </span>
        </div>
      </header>

      {children}

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Recruitment managed with Work Track.</p>
          <p>Candidate information is submitted only when you apply.</p>
        </div>
      </footer>
    </main>
  );
}
