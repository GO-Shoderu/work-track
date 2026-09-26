import { notFound } from "next/navigation";
import { CareerJobCard } from "../../../components/public-recruitment/career-job-card";
import { PublicRecruitmentShell } from "../../../components/public-recruitment/public-recruitment-shell";
import { getOrganisationCareers } from "../../../lib/public-recruitment/queries";

export const dynamic = "force-dynamic";

export default async function CareersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let result;
  try {
    result = await getOrganisationCareers({ careersSlug: slug });
  } catch {
    notFound();
  }

  if (!result) notFound();

  return (
    <PublicRecruitmentShell organisationName={result.organisation.name} careersHref={`/careers/${result.organisation.careers_slug}`}>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Careers</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Join {result.organisation.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Explore open roles and apply directly to the organisation.</p>

        {result.jobs.length ? (
          <div className="mt-8 grid gap-4">
            {result.jobs.map((job) => (
              <CareerJobCard
                key={job.public_id}
                title={job.title}
                teaser={job.teaser}
                closesAt={job.closes_at}
                href={`/careers/${result.organisation.careers_slug}/jobs/${job.public_id}`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <p className="font-semibold">No open roles right now.</p>
            <p className="mt-2 text-sm text-muted">Please check back later.</p>
          </div>
        )}
      </section>
    </PublicRecruitmentShell>
  );
}
