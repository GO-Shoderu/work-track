"use server";
import { headers } from "next/headers";
import { getEnvironment } from "../env";
import { recruitmentContext } from "./context";
import { createJobDraftSchema, saveJobContentSchema, jobLifecycleSchema } from "../validation/job-content";
import { jobSchema, candidateSchema, applicationSchema, stageSchema } from "../validation/recruitment";

export type MutationResult = { ok: true; id: string } | { ok: false; error: string };
const invalid = { ok: false, error: "Check the supplied recruitment details." } as const;
const unavailable = { ok: false, error: "Unable to confirm the change. Refresh and check before retrying." } as const;
async function allowedOrigin() {
  const env = getEnvironment();
  return !!env && (await headers()).get("origin") === new URL(env.APP_URL).origin;
}
function outcome(data: { id: string } | null, error: { code?: string } | null): MutationResult {
  if (error?.code === "23505") return { ok: false, error: "This Candidate already has an Application for this Job." };
  return !error && data ? { ok: true, id: data.id } : unavailable;
}
// Retain the existing plain-text form as an adapter: it becomes document input,
// never a trusted derived-description field. The RPC derives all persisted text.
export async function createJob(input: unknown): Promise<MutationResult> {
  if (!(await allowedOrigin())) return invalid;
  const parsed = jobSchema.safeParse(input); if (!parsed.success) return invalid;
  return createJobDraft({
    organisationId: parsed.data.organisationId, title: parsed.data.title,
    descriptionRich: { type: "doc", content: [{ type: "paragraph", ...(parsed.data.description ? { content: [{ type: "text", text: parsed.data.description }] } : {}) }] },
  });
}
async function saveContent(input: unknown, mode: "create" | "draft" | "edit"): Promise<MutationResult> {
  if (!(await allowedOrigin())) return invalid;
  const parsed = mode === "create" ? createJobDraftSchema.safeParse(input) : saveJobContentSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const content = parsed.data;
  const { client, organisation } = await recruitmentContext(content.organisationId);
  try {
    const { data, error } = await client.rpc("save_job_content", {
      target_organisation_id: organisation.id,
      target_job_id: "jobId" in content && typeof content.jobId === "string" ? content.jobId : null,
      job_title: content.title, job_document: content.descriptionRich,
      job_closes_at: content.closesAt,
      expected_content_version: "contentVersion" in content && typeof content.contentVersion === "number" ? content.contentVersion : null,
      draft_only: mode !== "edit",
    });
    if (error?.code === "40001") return { ok: false, error: "This Job changed. Reload it before saving." };
    if (error?.code === "22023") return { ok: false, error: "Check the Job content, closing date and current status." };
    return !error && data ? { ok: true, id: data } : unavailable;
  } catch { return unavailable; }
}
export async function createJobDraft(input: unknown): Promise<MutationResult> { return saveContent(input, "create"); }
export async function saveJobDraft(input: unknown): Promise<MutationResult> { return saveContent(input, "draft"); }
export async function editJob(input: unknown): Promise<MutationResult> { return saveContent(input, "edit"); }
async function changeJobStatus(input: unknown, status: "published" | "closed" | "archived"): Promise<MutationResult> {
  if (!(await allowedOrigin())) return invalid;
  const parsed = jobLifecycleSchema.safeParse(input); if (!parsed.success) return invalid;
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  try {
    const { data, error } = await client.rpc("transition_job", {
      target_organisation_id: organisation.id, target_job_id: parsed.data.jobId, next_status: status,
    });
    if (error?.code === "22023") return { ok: false, error: "Check the Job content, closing date and current status." };
    return !error && data === parsed.data.jobId ? { ok: true, id: data } : unavailable;
  } catch { return unavailable; }
}
export async function publishJob(input: unknown): Promise<MutationResult> { return changeJobStatus(input, "published"); }
export async function closeJob(input: unknown): Promise<MutationResult> { return changeJobStatus(input, "closed"); }
export async function archiveJob(input: unknown): Promise<MutationResult> { return changeJobStatus(input, "archived"); }
export async function createCandidate(input: unknown): Promise<MutationResult> {
  if (!(await allowedOrigin())) return invalid;
  const parsed = candidateSchema.safeParse(input); if (!parsed.success) return invalid;
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  const c = parsed.data;
  try {
    const { data, error } = await client.from("candidates").insert({ organisation_id: organisation.id, full_name: c.fullName, email: c.email, phone: c.phone, linkedin_url: c.linkedinUrl }).select("id").single();
    return outcome(data, error);
  } catch { return unavailable; }
}
export async function createApplication(input: unknown): Promise<MutationResult> {
  if (!(await allowedOrigin())) return invalid;
  const parsed = applicationSchema.safeParse(input); if (!parsed.success) return invalid;
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  try {
    // Composite FKs independently enforce both target relationships inside this insert.
    const { data, error } = await client.from("applications").insert({ organisation_id: organisation.id, candidate_id: parsed.data.candidateId, job_id: parsed.data.jobId }).select("id").single();
    return outcome(data, error);
  } catch { return unavailable; }
}
export async function updateApplicationStage(input: unknown): Promise<MutationResult> {
  if (!(await allowedOrigin())) return invalid;
  const parsed = stageSchema.safeParse(input); if (!parsed.success) return invalid;
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  try {
    const { data, error } = await client.from("applications").update({ stage: parsed.data.stage })
      .eq("organisation_id", organisation.id).eq("id", parsed.data.applicationId).select("id").single();
    return outcome(data, error);
  } catch { return unavailable; }
}
