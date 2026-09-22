import "server-only";
import { z } from "zod";
import { assessmentMessages } from "./prompt";
import { assessmentResultSchema, type AssessmentResult, ADVISORY_DISCLAIMER } from "./schema";

const configSchema = z.object({ key: z.string().trim().min(1), model: z.string().regex(/^[A-Za-z0-9._:-]{1,100}$/) });
export function requireAssessmentProvider() {
  const result = configSchema.safeParse({ key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_ASSESSMENT_MODEL });
  if (!result.success) throw new Error("AI assessment is not configured. Contact your administrator.");
  return result.data;
}
export type AssessmentProvider = (job: { title: string; description: string | null }, cvText: string) => Promise<AssessmentResult>;
const outputSchema = {
  type: "object", additionalProperties: false,
  required: ["score", "summary", "strengths", "gaps", "recommendation", "disclaimer"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string", minLength: 1, maxLength: 1200 },
    strengths: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 400 } },
    gaps: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 400 } },
    recommendation: { type: "string", enum: ["strong_match", "potential_match", "weak_match"] },
    disclaimer: { type: "string", enum: [ADVISORY_DISCLAIMER] },
  },
};
const envelopeSchema = z.object({
  status: z.literal("completed"),
  output: z.array(z.object({ type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional() })),
});
async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error("Missing response");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length; if (size > 65536) throw new Error("Response too large");
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { await reader.cancel().catch(() => {}); }
}
export const assessWithProvider: AssessmentProvider = async (job, cvText) => {
  const config = requireAssessmentProvider();
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, input: assessmentMessages(job, cvText), store: false,
        tools: [], tool_choice: "none", max_output_tokens: 2500,
        text: { format: { type: "json_schema", name: "candidate_assessment", strict: true, schema: outputSchema } } }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error("Provider unavailable"); }
    const envelope = envelopeSchema.parse(await boundedJson(response));
    // Reject refusal, unexpected tool output and multi-message output. Reasoning
    // items may accompany the one answer, but are never persisted or returned.
    if (envelope.output.some(item => !["message", "reasoning"].includes(item.type))) throw new Error("Unexpected output");
    const content = envelope.output.filter(item => item.type === "message").flatMap(item => item.content ?? []);
    if (content.length !== 1 || content[0].type !== "output_text" || !content[0].text) throw new Error("Unsupported output");
    return assessmentResultSchema.parse(JSON.parse(content[0].text));
  } catch { throw new Error("AI assessment is unavailable or returned an invalid result. Please try again later."); }
};
