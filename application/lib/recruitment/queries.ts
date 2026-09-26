import "server-only";
import { recruitmentContext } from "./context";
import { jobLifecycleSchema } from "../validation/job-content";
import { listSchema, pipelineSchema, namePattern } from "../validation/recruitment";

// Server Component loaders. Call again after mutations; no shared/cacheable tenant data.
export async function listJobs(input: unknown = {}) {
  const parsed = listSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid list parameters.");
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  const { offset, limit } = parsed.data;
  try {
    const { data, error } = await client.from("jobs").select("id,organisation_id,title,description,created_at,status,public_id,closes_at,teaser,published_at,closed_at,content_version")
      .eq("organisation_id", organisation.id).order("created_at", { ascending: false }).order("id").range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  } catch { throw new Error("Jobs are temporarily unavailable."); }
}
// The identity-only contract is shared with lifecycle actions; reads never mutate.
export async function getJobForEdit(input: unknown) {
  const parsed = jobLifecycleSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid Job details.");
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  try {
    const { data, error } = await client.from("jobs").select("id,title,description_rich,closes_at,status,content_version")
      .eq("organisation_id", organisation.id).eq("id", parsed.data.jobId).maybeSingle();
    if (error) throw error;
    return data;
  } catch { throw new Error("Job is temporarily unavailable."); }
}
export async function listCandidates(input: unknown = {}) {
  const parsed = listSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid list parameters.");
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  const { offset, limit } = parsed.data;
  try {
    const { data, error } = await client.from("candidates").select("id,organisation_id,full_name,email,phone,linkedin_url,created_at")
      .eq("organisation_id", organisation.id).order("created_at", { ascending: false }).order("id").range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  } catch { throw new Error("Candidates are temporarily unavailable."); }
}
export async function listPipeline(input: unknown = {}) {
  const parsed = pipelineSchema.safeParse(input); if (!parsed.success) throw new Error("Invalid pipeline parameters.");
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  const { offset, limit, jobId, candidateName, stage } = parsed.data;
  try {
    let query = client.from("applications").select("id,organisation_id,candidate_id,job_id,stage,source,assessment_status,created_at,updated_at,candidate:candidates!applications_candidate_fkey!inner(id,full_name),job:jobs!applications_job_fkey!inner(id,title)")
      .eq("organisation_id", organisation.id).is("removed_at", null);
    if (jobId) query = query.eq("job_id", jobId);
    if (candidateName) query = query.ilike("candidate.full_name", namePattern(candidateName));
    if (stage) query = query.eq("stage", stage);
    const { data, error } = await query.order("created_at", { ascending: false }).order("id").range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  } catch { throw new Error("Pipeline is temporarily unavailable."); }
}
