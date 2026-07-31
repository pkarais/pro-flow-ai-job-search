import { ZodError } from "zod";
import { evidenceAdditionRequestSchema } from "@pro-flow/career-core";
import {
  addCanonicalEvidence,
  RevisionConflictError,
} from "@/server/canonical/review-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = evidenceAdditionRequestSchema.parse(await request.json());
    const result = await addCanonicalEvidence(input);
    return Response.json({
      data: {
        revision: result.profile.revision,
        summary: result.summary,
        compatibilityValid: result.compatibilityValid,
        record: result.profile.records.at(-1),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "validation_error", message: "Enter valid evidence and try again.", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof RevisionConflictError) {
      return Response.json({ error: "revision_conflict", message: error.message, currentRevision: error.currentRevision }, { status: 409 });
    }
    return Response.json({ error: "storage_error", message: "The new evidence could not be saved." }, { status: 500 });
  }
}
