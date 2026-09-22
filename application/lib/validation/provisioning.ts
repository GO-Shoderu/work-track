import { z } from "zod";

const name = z.string().trim().min(1).max(200);
const account = { email: z.string().trim().max(254).email(), fullName: name };
export const provisioningSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("organisation"), ...account, organisationName: name }).strict(),
  z.object({ kind: z.literal("customer"), ...account, organisationId: z.uuid() }).strict(),
  z.object({ kind: z.literal("admin"), ...account }).strict(),
]);
export type ProvisioningInput = z.infer<typeof provisioningSchema>;
export const assignmentSchema = z.object({
  adminId: z.uuid(), organisationId: z.uuid(), assign: z.boolean(),
}).strict();
