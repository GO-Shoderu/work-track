"use server";
import { headers } from "next/headers";
import { getEnvironment } from "../env";
import { assessmentContext } from "./context";
import { requireAssessmentProvider, assessWithProvider } from "./provider";
import { assessmentResultSchema } from "./schema";
import { downloadCurrentCv } from "../cv/storage";
import { extractPdfText } from "../cv/pdf";

export async function requestJobCvAssessment(input: unknown) {
  const env = getEnvironment();
  if (!env || (await headers()).get("origin") !== new URL(env.APP_URL).origin) return { ok: false, error: "Assessment is not authorised." } as const;
  const context = await assessmentContext(input);
  try { requireAssessmentProvider(); } catch { return { ok: false, error: "AI assessment is not configured. Contact your administrator." } as const; }
  try {
    const { bytes, version } = await downloadCurrentCv(context, context.application.candidate_id);
    const text = await extractPdfText(bytes);
    const result = assessmentResultSchema.parse(await assessWithProvider(context.job, text));
    // Authenticated RPC rechecks actor role, current assignment and CV version
    // after the slow external request. No privileged table client is constructed.
    const saved = await context.client.rpc("save_candidate_assessment", {
      target_application_id: context.application.id, target_cv_object_id: version, validated_result: result,
    });
    if (saved.error || saved.data !== context.application.id) throw new Error("Persistence not confirmed");
    return { ok: true, applicationId: context.application.id, cvVersion: version, result } as const;
  } catch { return { ok: false, error: "Assessment could not be confirmed. Refresh and check the latest result before retrying." } as const; }
}
