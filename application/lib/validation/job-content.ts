import { z } from "zod";

// Deliberate Tiptap subset; no HTML, URLs, images, embeds or arbitrary attributes.
export const JOB_DOCUMENT_LIMITS = { bytes: 65536, nodes: 1000, depth: 8, children: 100, text: 20000 } as const;
export type JobNode = {
  type: "doc" | "paragraph" | "heading" | "bulletList" | "orderedList" | "listItem" | "text" | "hardBreak";
  content?: JobNode[];
  attrs?: { level: number } | { start: number };
  text?: string;
  marks?: { type: "bold" | "italic" | "strike" | "code" }[];
};
const mark = z.strictObject({ type: z.enum(["bold", "italic", "strike", "code"]) });
const text = z.strictObject({ type: z.literal("text"), text: z.string().min(1).max(20000).refine((s) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s)), marks: z.array(mark).max(4).refine((a) => new Set(a.map((m) => m.type)).size === a.length).optional() });
const inline = z.union([text, z.strictObject({ type: z.literal("hardBreak") })]);
const paragraph = z.strictObject({ type: z.literal("paragraph"), content: z.array(inline).max(100).optional() });
const heading = z.strictObject({ type: z.literal("heading"), attrs: z.strictObject({ level: z.union([z.literal(2), z.literal(3)]) }), content: z.array(inline).max(100).optional() });
const block: z.ZodType<JobNode> = z.lazy(() => z.union([
  paragraph, heading,
  z.strictObject({ type: z.literal("bulletList"), content: z.array(listItem).min(1).max(100) }),
  z.strictObject({ type: z.literal("orderedList"), attrs: z.strictObject({ start: z.number().int().min(1).max(1000000) }).optional(), content: z.array(listItem).min(1).max(100) }),
]));
const listItem: z.ZodType<JobNode> = z.lazy(() => z.strictObject({
  type: z.literal("listItem"), content: z.array(block).min(1).max(100).refine((a) => a[0]?.type === "paragraph"),
}));
const documentShape = z.strictObject({ type: z.literal("doc"), content: z.array(block).min(1).max(100) });

// Check bounds before recursive Zod parsing, including cyclic/non-JSON inputs.
function bounded(value: unknown): boolean {
  const stack = [{ value, depth: 0 }];
  const seen = new Set<object>();
  let nodes = 0;
  while (stack.length) {
    const entry = stack.pop()!;
    if (!entry.value || typeof entry.value !== "object" || Array.isArray(entry.value) || entry.depth > 8 || ++nodes > 1000 || seen.has(entry.value)) return false;
    seen.add(entry.value);
    const content = (entry.value as { content?: unknown }).content;
    if (content !== undefined) {
      if (!Array.isArray(content) || content.length > 100) return false;
      for (const child of content) stack.push({ value: child, depth: entry.depth + 1 });
    }
  }
  try { return Buffer.byteLength(JSON.stringify(value), "utf8") <= JOB_DOCUMENT_LIMITS.bytes; } catch { return false; }
}
function nodeText(node: JobNode): string {
  if (node.type === "text") return node.text!;
  if (node.type === "hardBreak") return "\n";
  const text = (node.content ?? []).map(nodeText).join("");
  return text + (node.type === "paragraph" || node.type === "heading" ? "\n" : "");
}
// A deterministic rendering of text nodes only; formatting never becomes HTML.
export function jobDescriptionText(document: JobNode): string {
  return nodeText(document).replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
}
export const jobDocumentSchema = z.unknown().refine(bounded, "Job document exceeds its limits.")
  .pipe(documentShape).refine((doc) => [...jobDescriptionText(doc)].length <= 20000, "Job description is too long.");
const closingDate = z.iso.datetime({ offset: true }).refine((s) => Number.isFinite(Date.parse(s)) && Date.parse(s) > Date.now(), "Closing date must be in the future.").nullable().optional().transform((s) => s ?? null);
const scope = { organisationId: z.uuid().optional() };
const content = { title: z.string().trim().min(1).max(200).refine((s) => !/[\u0000-\u001F\u007F]/.test(s)), descriptionRich: jobDocumentSchema, closesAt: closingDate };
export const createJobDraftSchema = z.strictObject({ ...scope, ...content });
export const saveJobContentSchema = z.strictObject({ ...scope, ...content, jobId: z.uuid(), contentVersion: z.number().int().positive().max(2147483647) });
export const jobLifecycleSchema = z.strictObject({ ...scope, jobId: z.uuid() });
