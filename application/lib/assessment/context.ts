import "server-only";
import { recruitmentContext } from "../recruitment/context";
import { assessmentRequestSchema, assessmentResultSchema } from "./schema";
import { currentCv } from "../cv/storage";

export async function assessmentContext(input: unknown) {
  const parsed = assessmentRequestSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid Application details.");
  const context = await recruitmentContext(parsed.data.organisationId);
  const { data: application, error } = await context.client.from("applications").select("id,candidate_id,job_id,organisation_id")
    .eq("organisation_id", context.organisation.id).eq("id", parsed.data.applicationId).maybeSingle();
  if (error || !application) throw new Error("Application is unavailable.");
  const { data: job, error: jobError } = await context.client.from("jobs").select("id,title,description,content_version")
    .eq("organisation_id", context.organisation.id).eq("id", application.job_id).maybeSingle();
  const { data: candidate, error: candidateError } = await context.client.from("candidates").select("id")
    .eq("organisation_id", context.organisation.id).eq("id", application.candidate_id).maybeSingle();
  if (jobError || candidateError || !job || !candidate) throw new Error("Application is unavailable.");
  return { ...context, application, job };
}
export async function readAssessmentResult(input: unknown) {
  const context = await assessmentContext(input);
  const cv = await currentCv(context, context.application.candidate_id);
  if (!cv) return null;
  const { data, error } = await context.client.from("candidate_assessments").select("result,cv_object_id,job_content_version,assessed_at")
    .eq("organisation_id", context.organisation.id).eq("application_id", context.application.id).eq("cv_object_id", cv.object_id).eq("job_content_version", context.job.content_version).maybeSingle();
  if (error) throw new Error("Assessment is unavailable.");
  if (!data) return null;
  const parsed = assessmentResultSchema.safeParse(data.result);
  if (!parsed.success) throw new Error("Assessment is unavailable.");
  return { applicationId: context.application.id, cvVersion: cv.object_id, assessedAt: data.assessed_at, result: parsed.data };
}
