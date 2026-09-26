import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicJobDetail } from "../../../../../components/public-recruitment/public-job-detail";
import { PublicRecruitmentShell } from "../../../../../components/public-recruitment/public-recruitment-shell";
import { getPublicJob } from "../../../../../lib/public-recruitment/queries";

export const dynamic = "force-dynamic";

export default async function PublicJobPage({
  params,
}: {
  params: Promise<{ slug: string; publicId: string }>;
}) {
  const { slug, publicId } = await params;
  let result;
  try {
    result = await getPublicJob({ careersSlug: slug, publicId });
  } catch {
    notFound();
  }
  if (!result) notFound();

  const careersHref = `/careers/${result.organisation.careers_slug}`;

  return (
    <PublicRecruitmentShell organisationName={result.organisation.name} careersHref={careersHref}>
      <div className="mx-auto max-w-4xl px-5 pt-8 sm:px-8">
        <Link href={careersHref} className="text-xs font-semibold text-muted hover:text-sidebar">← Back to careers</Link>
      </div>
      <PublicJobDetail
        title={result.job.title}
        organisationName={result.organisation.name}
        closesAt={result.job.closes_at}
        descriptionRich={result.job.description_rich}
        applyHref={`${careersHref}/jobs/${result.job.public_id}/apply`}
      />
    </PublicRecruitmentShell>
  );
}
