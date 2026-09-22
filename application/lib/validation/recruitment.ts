import { z } from "zod";

export const stages = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
const uuid = z.uuid();
const scope = { organisationId: uuid.optional() };
const optionalText = (schema: z.ZodString) => z.preprocess(
  (value) => value === undefined || value === null || (typeof value === "string" && !value.trim()) ? null : value,
  schema.nullable(),
);
export const jobSchema = z.strictObject({ ...scope, title: z.string().trim().min(1).max(200), description: optionalText(z.string().trim().max(20000)) });
export const candidateSchema = z.strictObject({
  ...scope, fullName: z.string().trim().min(1).max(200),
  email: optionalText(z.string().trim().email().max(254)),
  phone: optionalText(z.string().trim().min(1).max(50)),
  linkedinUrl: optionalText(z.string().trim().max(2048).regex(/^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_%~-]+\/?$/)),
});
export const applicationSchema = z.strictObject({ ...scope, candidateId: uuid, jobId: uuid });
export const stageSchema = z.strictObject({ ...scope, applicationId: uuid, stage: z.enum(stages) });
export const listSchema = z.strictObject({
  ...scope, offset: z.number().int().min(0).max(100000).default(0), limit: z.number().int().min(1).max(100).default(50),
});
export const pipelineSchema = listSchema.extend({ jobId: uuid.optional(), candidateName: z.string().trim().max(200).optional(), stage: z.enum(stages).optional() });
// PostgREST receives a literal substring pattern, not user-controlled LIKE wildcards.
export function namePattern(name: string) { return `%${name.replace(/[\\%_]/g, "\\$&")}%`; }
