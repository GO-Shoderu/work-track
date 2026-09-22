import { z } from "zod";
export const CV_BUCKET = "candidate-cvs";
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const cvInputSchema = z.strictObject({ organisationId: z.uuid().optional(), candidateId: z.uuid() });
export function cvPath(organisationId: string, candidateId: string, objectId: string) {
  const ids = z.array(z.uuid()).length(3).parse([organisationId, candidateId, objectId]);
  return `${ids.join("/")}.pdf`;
}
export function validatePdfUpload(file: File) {
  if (!(file instanceof File) || file.type !== "application/pdf" || !/\.pdf$/i.test(file.name) || file.size < 1 || file.size > MAX_CV_BYTES) {
    throw new Error("Upload a PDF file no larger than 5 MB.");
  }
}
export function validatePdfBytes(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_CV_BYTES || new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("The file is not a supported PDF.");
  }
}
