import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdminEnvironment } from "../env";
import type { Database } from "../supabase/database.types";
import { CV_BUCKET, validatePdfBytes } from "../cv/validation";
import { assessmentResultSchema } from "../assessment/schema";
import { applicationCvPath, completedSubmission, publicApplicationInput, uploadTicket } from "./contracts";

type Applicant = z.infer<typeof publicApplicationInput>;
type Ticket = z.infer<typeof uploadTicket>;
type Submission = z.infer<typeof completedSubmission>;

// Narrow privileged surface: no generic database or Storage client escapes.
export function publicApplicationService() {
  const env = requireAdminEnvironment();
  const client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) }) },
  });
  return {
    async prepare(input: Applicant, size: number) {
      const { data, error } = await client.rpc("prepare_public_application", {
        target_slug: input.careersSlug, target_public_id: input.publicId, applicant_email: input.email, cv_bytes: size,
      });
      if (error) throw new Error("Submission unavailable");
      return uploadTicket.parse(data);
    },
    async upload(ticket: Ticket, bytes: Uint8Array) {
      validatePdfBytes(bytes);
      const path = applicationCvPath(ticket.organisation_id, ticket.id, ticket.object_id);
      const { error } = await client.storage.from(CV_BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: false, cacheControl: "0" });
      if (error) throw new Error("Upload not confirmed");
    },
    async complete(ticket: Ticket, input: Applicant) {
      const { data, error } = await client.rpc("complete_public_application", {
        upload_id: ticket.id, full_name: input.fullName, applicant_email: input.email, phone: input.phone, linkedin_url: input.linkedinUrl,
      });
      if (error) throw new Error("Submission not confirmed");
      const saved = completedSubmission.parse(data);
      if (saved.application_id !== ticket.id || saved.cv_object_id !== ticket.object_id) throw new Error("Submission not confirmed");
      return saved;
    },
    async finishAssessment(submission: Submission, result: z.infer<typeof assessmentResultSchema> | null) {
      const { data, error } = await client.rpc("finish_public_assessment", {
        target_application_id: submission.application_id, target_cv_object_id: submission.cv_object_id,
        target_job_content_version: submission.job_content_version, validated_result: result === null ? null : assessmentResultSchema.parse(result),
      });
      if (error || data !== submission.application_id) throw new Error("Assessment not confirmed");
    },
  };
}
