import { readCandidateCv } from "../../../../../../lib/cv/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  try {
    const { candidateId } = await params;
    const search = new URL(request.url).searchParams;
    if ([...search.keys()].some((key) => key !== "organisationId") || search.getAll("organisationId").length > 1) throw new Error("Invalid context");
    const { bytes } = await readCandidateCv({ candidateId, organisationId: search.get("organisationId") ?? undefined });
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="candidate-${candidateId}-cv.pdf"`,
      },
    });
  } catch {
    // Also maps identity redirects/tenant notFound to a private API 404. Do not
    // reveal whether an inaccessible Candidate, CV, or Storage object exists.
    return new Response("CV not found.", { status: 404, headers: privateHeaders });
  }
}
