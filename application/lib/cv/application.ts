import "server-only";
import type { recruitmentContext } from "../recruitment/context";
import { applicationCvPath } from "../public-recruitment/contracts";
import { CV_BUCKET, MAX_CV_BYTES, validatePdfBytes } from "./validation";

type Context = Awaited<ReturnType<typeof recruitmentContext>>;
export async function applicationCv(context: Context, applicationId: string) {
  const { data, error } = await context.client.from("application_cvs")
    .select("application_id,organisation_id,object_id,storage_path,byte_size")
    .eq("organisation_id", context.organisation.id).eq("application_id", applicationId).maybeSingle();
  if (error || (data && data.storage_path !== applicationCvPath(context.organisation.id, applicationId, data.object_id))) throw new Error("CV information is unavailable.");
  return data;
}
export async function downloadApplicationCv(context: Context, applicationId: string) {
  const cv = await applicationCv(context, applicationId);
  if (!cv) throw new Error("CV is unavailable.");
  const { data, error } = await context.client.storage.from(CV_BUCKET).download(cv.storage_path);
  if (error || !data || data.size > MAX_CV_BYTES) throw new Error("CV is unavailable.");
  const bytes = new Uint8Array(await data.arrayBuffer());
  validatePdfBytes(bytes);
  if (bytes.length !== cv.byte_size) throw new Error("CV is unavailable.");
  return { bytes, version: cv.object_id };
}
