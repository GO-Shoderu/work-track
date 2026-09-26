import "server-only";
import { after } from "next/server";
import { publicApplicationInput } from "./contracts";
import { publicApplicationService } from "./service";
import { validatePdfUpload } from "../cv/validation";
import { extractPdfText } from "../cv/pdf";
import { assessWithProvider } from "../assessment/provider";
import { assessmentResultSchema } from "../assessment/schema";

const failure = { ok: false, error: "Your application could not be confirmed. Please contact the organisation before retrying." } as const;
export async function submitPublicApplication(input: unknown, file: File) {
  try {
    const applicant = publicApplicationInput.parse(input);
    validatePdfUpload(file);
    const service = publicApplicationService();
    // Durable admission control precedes expensive native extraction and Storage.
    const ticket = await service.prepare(applicant, file.size);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = await extractPdfText(bytes);
    await service.upload(ticket, bytes);
    const submission = await service.complete(ticket, applicant);
    // Register only after Application + immutable CV persistence is confirmed.
    // Next.js runs this callback after the response; no AI work blocks success.
    try {
      after(async () => {
        try {
          // Exact submitted CV text, never the matched Candidate's shared CV.
          const result = assessmentResultSchema.parse(await assessWithProvider(submission, text));
          await service.finishAssessment(submission, result);
        } catch {
          try { await service.finishAssessment(submission, null); } catch {
            // A Job edit can leave stale; a DB outage/interruption can leave
            // pending. Never undo the Application or change recruitment stage.
          }
        }
      });
    } catch {
      // If scheduling is unavailable, retain pending for recruiter reassessment.
      // A confirmed Application must still be acknowledged as successful.
    }
    return { ok: true } as const;
  } catch {
    // Storage/DB timeouts can be ambiguous. Never delete an uploaded object
    // blindly: the transaction may have committed. Retain private orphans for
    // operator reconciliation; never claim success without confirmation.
    return failure;
  }
}
