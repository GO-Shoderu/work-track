import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().max(254).email(),
  // Existing passwords must not be trimmed or subjected to a new signup policy.
  password: z.string().min(1).max(4096),
}).strict();

export const profileSchema = z.discriminatedUnion("role", [
  z.object({ id: z.uuid(), full_name: z.string().trim().min(1).max(200), role: z.literal("platform_owner"), organisation_id: z.null() }),
  z.object({ id: z.uuid(), full_name: z.string().trim().min(1).max(200), role: z.literal("admin"), organisation_id: z.null() }),
  z.object({ id: z.uuid(), full_name: z.string().trim().min(1).max(200), role: z.literal("customer"), organisation_id: z.uuid() }),
]);

export const organisationIdSchema = z.uuid();
export type TrustedProfile = z.infer<typeof profileSchema>;
