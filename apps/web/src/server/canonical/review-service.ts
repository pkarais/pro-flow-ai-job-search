import "server-only";

import path from "node:path";
import {
  canonicalReviewSummarySchema,
  evidenceDecisionRequestSchema,
  type CanonicalCareerProfile,
  type CanonicalReviewSummary,
  type EvidenceDecisionRequest,
  type EvidenceImportResult,
} from "@pro-flow/career-core";
import {
  CanonicalProfileStore,
  RevisionConflictError,
  SourceEvidenceChangedError,
  createCanonicalProfile,
} from "./canonical-store";

function dataRoot(): string {
  return path.resolve(process.cwd(), "../..", "career-data");
}

function store(): CanonicalProfileStore {
  return new CanonicalProfileStore(dataRoot());
}

export function summarizeCanonicalReview(
  profile: CanonicalCareerProfile | null,
  totalIfMissing = 0,
): CanonicalReviewSummary {
  if (!profile) {
    return canonicalReviewSummarySchema.parse({
      revision: 0,
      total: totalIfMissing,
      pending: totalIfMissing,
      confirmed: 0,
      corrected: 0,
      rejected: 0,
    });
  }
  const counts = { pending: 0, confirmed: 0, corrected: 0, rejected: 0 };
  for (const record of profile.records) counts[record.decision] += 1;
  return canonicalReviewSummarySchema.parse({
    revision: profile.revision,
    total: profile.records.length,
    ...counts,
  });
}

export async function loadCanonicalReview(
  imported: EvidenceImportResult,
): Promise<{
  profile: CanonicalCareerProfile | null;
  summary: CanonicalReviewSummary;
  compatibilityValid: boolean;
}> {
  const repository = store();
  const profile = await repository.load();
  return {
    profile,
    summary: summarizeCanonicalReview(profile, imported.facts.length),
    compatibilityValid: profile ? await repository.verifyCompatibility(profile) : true,
  };
}

export async function decideImportedFact(
  imported: EvidenceImportResult,
  requestInput: EvidenceDecisionRequest,
): Promise<{
  profile: CanonicalCareerProfile;
  summary: CanonicalReviewSummary;
  compatibilityValid: boolean;
}> {
  const request = evidenceDecisionRequestSchema.parse(requestInput);
  const importedFact = imported.facts.find((fact) => fact.id === request.factId);
  if (!importedFact) throw new Error("The selected evidence item is not in the current allowlisted import.");

  const repository = store();
  const current = await repository.load();
  const working = current ?? createCanonicalProfile(imported);
  const record = working.records.find((item) => item.id === request.factId);
  if (!record) throw new SourceEvidenceChangedError(request.factId);
  if (
    record.value !== importedFact.value
    || record.sourcePath !== importedFact.sourcePath
    || record.path !== importedFact.path
  ) {
    throw new SourceEvidenceChangedError(request.factId);
  }

  const decidedAt = new Date().toISOString();
  const updated: CanonicalCareerProfile = {
    ...working,
    records: working.records.map((item) =>
      item.id === request.factId
        ? {
            ...item,
            decision: request.decision,
            ...(request.decision === "corrected"
              ? { correctedValue: request.correctedValue }
              : { correctedValue: undefined }),
            ...(request.note ? { decisionNote: request.note } : { decisionNote: undefined }),
            decidedAt,
          }
        : item,
    ),
  };

  const saved = await repository.save(updated, request.expectedRevision);
  return {
    profile: saved,
    summary: summarizeCanonicalReview(saved),
    compatibilityValid: await repository.verifyCompatibility(saved),
  };
}

export { RevisionConflictError, SourceEvidenceChangedError };
