import { notFound } from "next/navigation";
import { CareerJobCard } from "../../../components/public-recruitment/career-job-card";
import { PublicApplicationForm } from "../../../components/public-recruitment/public-application-form";
import { PublicJobDetail } from "../../../components/public-recruitment/public-job-detail";
import { PublicRecruitmentShell } from "../../../components/public-recruitment/public-recruitment-shell";

const document = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "About the role" }] },
    { type: "paragraph", content: [{ type: "text", text: "We are looking for a Product & Brand Designer who can move from an unclear problem to a useful identity and a usable digital experience." }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Responsibilities" }] },
    { type: "bulletList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Join discovery calls and understand the audience." }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Create wireframes, prototypes and brand systems." }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Work closely with engineers and business teams." }] }] },
    ] },
  ],
};

export default function PublicRecruitmentPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const organisationName = "Work Track Local Demo";
  const closesAt = "2026-09-30T21:59:00.000Z";

  return (
    <PublicRecruitmentShell organisationName={organisationName}>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Careers</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Join {organisationName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Explore open roles and apply directly to the organisation.
        </p>
        <div className="mt-8 grid gap-4">
          <CareerJobCard
            title="Product & Brand Designer"
            teaser="Help shape useful digital products and coherent brand experiences."
            closesAt={closesAt}
            href="#job-preview"
          />
        </div>
      </section>

      <section id="job-preview" className="border-t border-border bg-[#e9ebf0]">
        <PublicJobDetail
          title="Product & Brand Designer"
          organisationName={organisationName}
          closesAt={closesAt}
          descriptionRich={document}
          applyHref="#apply-preview"
        />
      </section>

      <section id="apply-preview" className="border-t border-border bg-workspace">
        <PublicApplicationForm jobTitle="Product & Brand Designer" />
      </section>
    </PublicRecruitmentShell>
  );
}
