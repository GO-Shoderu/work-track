import Link from "next/link";

function deadlineLabel(value: string | null) {
  if (!value) return "Open until filled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Closing date unavailable";
  return `Closes ${new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date)}`;
}

export function CareerJobCard({
  title,
  teaser,
  closesAt,
  href,
}: {
  title: string;
  teaser: string | null;
  closesAt: string | null;
  href: string;
}) {
  return (
    <article className="group rounded-2xl border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(13_15_20/0.08)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            Open role
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-sidebar">
            {title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            {teaser || "View the role details, requirements and application information."}
          </p>
          <p className="mt-4 text-xs font-semibold text-sidebar">{deadlineLabel(closesAt)}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-xl bg-sidebar px-4 py-2.5 text-center text-xs font-semibold text-white transition group-hover:bg-sidebar-hover"
        >
          View role
        </Link>
      </div>
    </article>
  );
}
