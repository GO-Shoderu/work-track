"use client";

import { useState } from "react";

export function CandidateFilter({
  targetId,
  count,
}: {
  targetId: string;
  count: number;
}) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(count);

  function filterCandidates(value: string) {
    setQuery(value);
    const normalized = value.trim().toLowerCase();
    const container = document.getElementById(targetId);
    if (!container) return;

    const rows = Array.from(
      container.querySelectorAll<HTMLElement>("[data-candidate-search]")
    );
    let visible = 0;

    rows.forEach((row) => {
      const matches =
        !normalized || (row.dataset.candidateSearch ?? "").includes(normalized);
      row.hidden = !matches;
      if (matches) visible += 1;
    });

    setVisibleCount(visible);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block w-full sm:max-w-md">
        <span className="sr-only">Search candidates</span>
        <input
          type="search"
          value={query}
          onChange={(event) => filterCandidates(event.target.value)}
          placeholder="Search candidates by name or email…"
          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-[#9bbb00] focus:ring-2 focus:ring-lime/20"
        />
      </label>
      <p className="shrink-0 text-xs font-medium text-muted">
        {query
          ? `${visibleCount} of ${count} candidates`
          : `${count} candidate${count === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
