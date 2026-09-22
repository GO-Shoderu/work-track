import { z } from "zod";
export const ADVISORY_DISCLAIMER = "AI-assisted assessment. Human recruiter judgement is required. This is not a hiring decision.";
export const assessmentResultSchema = z.strictObject({
  score: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1).max(1200),
  strengths: z.array(z.string().trim().min(1).max(400)).max(8),
  gaps: z.array(z.string().trim().min(1).max(400)).max(8),
  recommendation: z.enum(["strong_match", "potential_match", "weak_match"]),
  disclaimer: z.literal(ADVISORY_DISCLAIMER),
});
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
export const assessmentRequestSchema = z.strictObject({ organisationId: z.uuid().optional(), applicationId: z.uuid() });
