import "server-only";
import { recruitmentContext } from "./context";
import { jobApplicationsSchema } from "../validation/recruitment";

export async function listJobApplications(input: unknown) {
  const parsed = jobApplicationsSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid Job applicant parameters.");
  const { client, organisation } = await recruitmentContext(parsed.data.organisationId);
  const { jobId, offset, limit } = parsed.data;
  try {
    const { data: applications, error } = await client.from("applications")
      .select("id,candidate_id,job_id,stage,source,assessment_status,created_at,candidate:candidates!applications_candidate_fkey!inner(full_name,email)")
      .eq("organisation_id", organisation.id).eq("job_id", jobId).is("removed_at", null)
      .order("created_at", { ascending: false }).order("id").range(offset, offset + limit - 1);
    if (error) throw error;
    if (!applications?.length) return [];
    const publicIds = applications.filter((a) => a.source === "public").map((a) => a.id);
    const manualCandidateIds = [...new Set(applications.filter((a) => a.source === "manual").map((a) => a.candidate_id))];
    // Bounded to this page. Fetch no Storage paths or unrelated Candidate fields.
    const [publicCvs, manualCvs] = await Promise.all([
      publicIds.length ? client.from("application_cvs")
        .select("application_id,submitted_full_name,normalized_email,submitted_phone,submitted_linkedin_url")
        .eq("organisation_id", organisation.id).eq("job_id", jobId).in("application_id", publicIds)
        : Promise.resolve({ data: [], error: null }),
      manualCandidateIds.length ? client.from("candidate_cvs").select("candidate_id")
        .eq("organisation_id", organisation.id).in("candidate_id", manualCandidateIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (publicCvs.error || manualCvs.error) throw new Error("CV metadata unavailable");
    const snapshots = new Map(publicCvs.data?.map((cv) => [cv.application_id, cv]));
    const candidateCvs = new Set(manualCvs.data?.map((cv) => cv.candidate_id));
    return applications.map((application) => {
      const snapshot = application.source === "public" ? snapshots.get(application.id) : undefined;
      return {
        id: application.id, candidate_id: application.candidate_id, job_id: application.job_id,
        stage: application.stage, source: application.source, assessment_status: application.assessment_status,
        created_at: application.created_at,
        candidate: { full_name: application.candidate.full_name, email: application.candidate.email },
        // Public applicant contact comes from this immutable snapshot, not the
        // canonical Candidate. Manual Applications have no submitted snapshot.
        submitted_full_name: snapshot?.submitted_full_name ?? null,
        submitted_email: snapshot?.normalized_email ?? null,
        submitted_phone: snapshot?.submitted_phone ?? null,
        submitted_linkedin_url: snapshot?.submitted_linkedin_url ?? null,
        cv_available: application.source === "public" ? !!snapshot : candidateCvs.has(application.candidate_id),
      };
    });
  } catch { throw new Error("Job applicants are temporarily unavailable."); }
}
