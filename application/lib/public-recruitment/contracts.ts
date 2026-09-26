import { z } from "zod";
import { jobDocumentSchema } from "../validation/job-content";

const careersSlug = z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const publicJobInput = z.strictObject({ careersSlug, publicId: z.uuid() });
export const careersInput = z.strictObject({
  careersSlug,
  offset: z.number().int().min(0).max(100000).default(0),
  limit: z.number().int().min(1).max(100).default(50),
});
const organisation = z.strictObject({ name: z.string(), careers_slug: careersSlug });
const jobCard = z.strictObject({
  public_id: z.uuid(), title: z.string().max(200),
  teaser: z.string().max(500).nullable(), closes_at: z.string().nullable(), published_at: z.string().nullable(),
});
const job = jobCard.extend({
  description_rich: jobDocumentSchema.nullable(), description: z.string().max(20000).nullable(),
});
export const careersResult = z.strictObject({ organisation, jobs: z.array(jobCard).max(100) });
export const publicJobResult = z.strictObject({ organisation, job });

// Conservative ASCII mailbox normalization: trim/lowercase only, no alias folding.
const email = z.string().trim().max(254).email()
  .regex(/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/)
  .transform((value) => value.toLowerCase());
// Preserve submitted spelling/spacing; only email is normalized for matching.
const text = (max: number) => z.string().min(1).max(max).refine((value) => value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value));
export const publicApplicationInput = publicJobInput.extend({
  fullName: text(200), email,
  phone: text(50).nullable().optional().transform((value) => value ?? null),
  linkedinUrl: z.string().max(2048).regex(/^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_%~-]+\/?$/).nullable().optional().transform((value) => value ?? null),
});
export const uploadTicket = z.strictObject({ id: z.uuid(), organisation_id: z.uuid(), object_id: z.uuid() });
export const completedSubmission = z.strictObject({
  application_id: z.uuid(), cv_object_id: z.uuid(), job_content_version: z.number().int().positive(),
  title: z.string().max(200), description: z.string().max(20000).nullable(),
});
export function applicationCvPath(organisationId: string, applicationId: string, objectId: string) {
  return `${z.uuid().parse(organisationId)}/applications/${z.uuid().parse(applicationId)}/${z.uuid().parse(objectId)}.pdf`;
}
