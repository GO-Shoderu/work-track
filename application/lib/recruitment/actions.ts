"use server";
import { headers } from "next/headers";
import { getEnvironment } from "../env";
import { recruitmentContext } from "./context";
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
export async function createJob(input: unknown): Promise<MutationResult> {
  if (!(await allowedOrigin())) return invalid;
  const parsed = jobSchema.safeParse(input); if (!parsed.success) return invalid;
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  try {
    const { data, error } = await client.from("jobs").insert({ organisation_id: organisation.id, title: parsed.data.title, description: parsed.data.description }).select("id").single();
    return outcome(data, error);
  } catch { return unavailable; }
}
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
