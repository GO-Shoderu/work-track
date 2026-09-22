"use server";
import { headers } from "next/headers";
import { getEnvironment } from "../env";
import { candidateCvContext, storeCurrentCv } from "./storage";
import { validatePdfUpload } from "./validation";
import { extractPdfText } from "./pdf";

export async function uploadCandidateCv(input: unknown, form: FormData) {
  const env = getEnvironment();
  if (!env || (await headers()).get("origin") !== new URL(env.APP_URL).origin) return { ok: false, error: "Upload is not authorised." } as const;
  // Authorization before parsing or uploading file content. Next auth/notFound
  // signals remain intact rather than being swallowed as provider failures.
  const context = await candidateCvContext(input);
  if (!(form instanceof FormData) || [...form.keys()].length !== 1 || !form.has("file")) return { ok: false, error: "Provide one PDF file." } as const;
  const file = form.get("file");
  try { validatePdfUpload(file as File); } catch { return { ok: false, error: "Upload a PDF file no larger than 5 MB." } as const; }
  try {
    const bytes = new Uint8Array(await (file as File).arrayBuffer());
    await extractPdfText(bytes); // Reject unreadable/scanned/unsupported PDFs before Storage.
    const cv = await storeCurrentCv(context, context.candidateId, bytes);
    return { ok: true, cv } as const;
  } catch { return { ok: false, error: "CV could not be confirmed. Use a readable text-based PDF and refresh before retrying." } as const; }
}
