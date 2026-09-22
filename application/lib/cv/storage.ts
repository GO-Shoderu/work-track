import "server-only";
import { randomUUID } from "node:crypto";
import { recruitmentContext } from "../recruitment/context";
import { CV_BUCKET, cvPath, cvInputSchema, MAX_CV_BYTES, validatePdfBytes } from "./validation";

type Context = Awaited<ReturnType<typeof recruitmentContext>>;
export async function candidateCvContext(input: unknown) {
  const parsed = cvInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid Candidate details.");
  const context = await recruitmentContext(parsed.data.organisationId);
  const { data, error } = await context.client.from("candidates").select("id")
    .eq("organisation_id", context.organisation.id).eq("id", parsed.data.candidateId).maybeSingle();
  if (error || !data) throw new Error("Candidate is unavailable.");
  return { ...context, candidateId: data.id };
}
export async function currentCv(context: Context, candidateId: string) {
  const { data, error } = await context.client.from("candidate_cvs").select("candidate_id,organisation_id,object_id,storage_path,byte_size,updated_at")
    .eq("organisation_id", context.organisation.id).eq("candidate_id", candidateId).maybeSingle();
  if (error) throw new Error("CV information is unavailable.");
  if (data && data.storage_path !== cvPath(context.organisation.id, candidateId, data.object_id)) throw new Error("CV information is unavailable.");
  return data;
}
export async function inspectCurrentCv(input: unknown) {
  const context = await candidateCvContext(input);
  const cv = await currentCv(context, context.candidateId);
  return cv ? { candidateId: cv.candidate_id, version: cv.object_id, byteSize: cv.byte_size, updatedAt: cv.updated_at, fileName: "candidate-cv.pdf", contentType: "application/pdf" } : null;
}
export async function storeCurrentCv(context: Context, candidateId: string, bytes: Uint8Array) {
  validatePdfBytes(bytes);
  const previous = await currentCv(context, candidateId);
  const objectId = randomUUID();
  const path = cvPath(context.organisation.id, candidateId, objectId);
  const bucket = context.client.storage.from(CV_BUCKET);
  const uploaded = await bucket.upload(path, bytes, { contentType: "application/pdf", upsert: false, cacheControl: "0" });
  if (uploaded.error) throw new Error("CV upload could not be confirmed. Refresh before retrying.");
  const fields = { object_id: objectId, byte_size: bytes.length };
  const query = previous
    ? context.client.from("candidate_cvs").update(fields).eq("organisation_id", context.organisation.id).eq("candidate_id", candidateId).eq("object_id", previous.object_id)
    : context.client.from("candidate_cvs").insert({ ...fields, organisation_id: context.organisation.id, candidate_id: candidateId });
  const saved = await query.select("object_id").maybeSingle();
  // An uncertain DB response may have committed. Never delete this uploaded object
  // blindly: retaining a private orphan is safer than breaking the current CV.
  if (saved.error || saved.data?.object_id !== objectId) throw new Error("CV update could not be confirmed. Refresh before retrying.");
  // Best-effort removal of the old, never-current-again immutable version.
  // Failure (including mid-request revocation) leaves a tenant-private old object.
  if (previous) { try { await bucket.remove([previous.storage_path]); } catch { /* preserve confirmed success */ } }
  return { candidateId, version: objectId, byteSize: bytes.length };
}
export async function downloadCurrentCv(context: Context, candidateId: string) {
  const cv = await currentCv(context, candidateId);
  if (!cv) throw new Error("Upload a readable PDF CV first.");
  const { data, error } = await context.client.storage.from(CV_BUCKET).download(cv.storage_path);
  if (error || !data || data.size > MAX_CV_BYTES) throw new Error("CV is unavailable.");
  const bytes = new Uint8Array(await data.arrayBuffer());
  validatePdfBytes(bytes);
  if (bytes.length !== cv.byte_size) throw new Error("CV is unavailable.");
  return { bytes, version: cv.object_id };
}
// For a future authenticated download route: stream these bytes as an attachment
// with Cache-Control: private, no-store. Do not generate public/signed URLs.
export async function readCandidateCv(input: unknown) {
  const context = await candidateCvContext(input);
  return downloadCurrentCv(context, context.candidateId);
}
