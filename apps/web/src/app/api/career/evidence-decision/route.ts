import { ZodError } from "zod";
import { evidenceDecisionRequestSchema } from "@pro-flow/career-core";
import {
  RevisionConflictError,
  SourceEvidenceChangedError,
  decideImportedFact,
} from "@/server/canonical/review-service";
import { loadExecutiveEvidencePreview } from "@/server/evidence/preview-service";

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
    const preview = await loadExecutiveEvidencePreview();
    if (preview.status === "not_configured") {
      return fail("configuration_error", "Executive Career OS is not configured.", 503);
    }
    if (preview.status === "error") {
      return fail("source_error", preview.message, 502);
    }

    const result = await decideImportedFact(preview.result, decision);
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
