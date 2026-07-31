import { ZodError } from "zod";
import { evidenceDecisionRequestSchema } from "@pro-flow/career-core";
import {
  RevisionConflictError,
  SourceEvidenceChangedError,
  decideCanonicalFact,
} from "@/server/canonical/review-service";

export const runtime = "nodejs";

function fail(error: string, message: string, status: number, details?: unknown) {
  return Response.json(
    { error, message, ...(details ? { details } : {}) },
    { status },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("validation_error", "The decision request must be valid JSON.", 400);
  }

  try {
    const decision = evidenceDecisionRequestSchema.parse(body);
    const result = await decideCanonicalFact(decision);
    const record = result.profile.records.find((item) => item.id === decision.factId);
    return Response.json({
      data: {
        revision: result.profile.revision,
        summary: result.summary,
        compatibilityValid: result.compatibilityValid,
        record,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(
        "validation_error",
        "Correct the review decision and try again.",
        400,
        error.flatten(),
      );
    }
    if (error instanceof RevisionConflictError) {
      return fail("revision_conflict", error.message, 409, {
        currentRevision: error.currentRevision,
      });
    }
    if (error instanceof SourceEvidenceChangedError) {
      return fail("source_changed", error.message, 409);
    }
    return fail("storage_error", "The review decision could not be saved.", 500);
  }
}
