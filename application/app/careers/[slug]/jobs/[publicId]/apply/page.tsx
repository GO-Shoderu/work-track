import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicApplicationForm } from "../../../../../../components/public-recruitment/public-application-form";
import { PublicRecruitmentShell } from "../../../../../../components/public-recruitment/public-recruitment-shell";
import { getPublicJob } from "../../../../../../lib/public-recruitment/queries";

export const dynamic = "force-dynamic";

export default async function PublicApplyPage({
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
  const jobHref = `${careersHref}/jobs/${result.job.public_id}`;

  return (
    <PublicRecruitmentShell organisationName={result.organisation.name} careersHref={careersHref}>
      <div className="mx-auto max-w-2xl px-5 pt-8 sm:px-8">
        <Link href={jobHref} className="text-xs font-semibold text-muted hover:text-sidebar">← Back to role</Link>
      </div>
      <PublicApplicationForm
        jobTitle={result.job.title}
        careersSlug={result.organisation.careers_slug}
        publicId={result.job.public_id}
      />
    </PublicRecruitmentShell>
  );
}
