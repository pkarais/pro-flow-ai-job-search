import "server-only";

import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  canonicalReviewSummarySchema,
  evidenceAdditionRequestSchema,
  evidenceDecisionRequestSchema,
  evidenceImportResultSchema,
  type CanonicalCareerProfile,
  type CanonicalReviewSummary,
  type EvidenceDecisionRequest,
  type EvidenceAdditionRequest,
  type EvidenceImportResult,
} from "@pro-flow/career-core";
import {
  CanonicalProfileStore,
  RevisionConflictError,
  SourceEvidenceChangedError,
} from "./canonical-store";

function dataRoot(): string {
  return path.resolve(process.cwd(), "../..", "career-data");
}

function store(): CanonicalProfileStore {
  return new CanonicalProfileStore(dataRoot());
}

export async function loadCanonicalProfile(): Promise<CanonicalCareerProfile | null> {
  return store().load();
}

export function careerDataRoot(): string {
  return dataRoot();
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
  imported?: EvidenceImportResult,
): Promise<{
  profile: CanonicalCareerProfile | null;
  summary: CanonicalReviewSummary;
  compatibilityValid: boolean;
  evidence: EvidenceImportResult | null;
}> {
  const repository = store();
  const profile = await repository.load();
  return {
    profile,
    summary: summarizeCanonicalReview(profile, imported?.facts.length ?? 0),
    compatibilityValid: profile ? await repository.verifyCompatibility(profile) : true,
    evidence: profile ? canonicalEvidenceView(profile) : imported ?? null,
  };
}

function canonicalEvidenceView(profile: CanonicalCareerProfile): EvidenceImportResult {
  const grouped = new Map<string, CanonicalCareerProfile["records"]>();
  for (const record of profile.records) {
    grouped.set(record.sourceId, [...(grouped.get(record.sourceId) ?? []), record]);
  }
  const sources = [...grouped.entries()].map(([sourceId, records]) => {
    const first = records[0];
    const project = first.path.startsWith("projects") || first.sourcePath.includes("/projects/");
    return {
      id: sourceId,
      relativePath: first.sourcePath,
      label: first.sourceSection || sourceId.replaceAll("_", " "),
      kind: project ? "project" as const : "knowledge" as const,
      targetPath: first.path.split(".")[0],
      status: "loaded" as const,
      factCount: records.length,
    };
  });
  return evidenceImportResultSchema.parse({
    importedAt: profile.sourceImportedAt,
    sourceCount: sources.length,
    loadedSourceCount: sources.length,
    sources,
    facts: profile.records.map((record) => ({
      id: record.id,
      path: record.path,
      value: record.value,
      sourceId: record.sourceId,
      sourcePath: record.sourcePath,
      sourceSection: record.sourceSection,
      status: record.status,
      conflictNote: record.conflictNote,
    })),
    issues: profile.records
      .filter((record) => record.status === "conflicting" && record.decision === "pending")
      .map((record) => ({
        id: `${record.id}_verification`,
        severity: "warning" as const,
        sourceId: record.sourceId,
        message: `${record.sourceSection || "Career evidence"}: confirm this source-marked uncertainty.`,
      })),
    readOnly: true,
  });
}

const addedEvidenceCategories = {
  experience: { path: "career_history.user_added", section: "Professional Experience" },
  skills: { path: "capabilities.user_added", section: "Skills and Capabilities" },
  projects: { path: "projects.user_added", section: "Projects and Systems" },
  education: { path: "education.user_added", section: "Education" },
  credentials: { path: "credentials.user_added", section: "Credentials" },
  other: { path: "additional_evidence.user_added", section: "Additional Evidence" },
} as const;

export async function addCanonicalEvidence(
  requestInput: EvidenceAdditionRequest,
): Promise<{
  profile: CanonicalCareerProfile;
  summary: CanonicalReviewSummary;
  compatibilityValid: boolean;
}> {
  const request = evidenceAdditionRequestSchema.parse(requestInput);
  const repository = store();
  const current = await repository.load();
  if (!current) throw new Error("The canonical career profile has not been created.");
  const category = addedEvidenceCategories[request.category];
  const decidedAt = new Date().toISOString();
  const saved = await repository.save({
    ...current,
    records: [...current.records, {
      id: `evidence_${randomUUID().replaceAll("-", "")}`,
      path: category.path,
      value: request.value,
      sourceId: "user_added",
      sourcePath: "career-data/canonical-career.json",
      sourceSection: category.section,
      status: "needs_review",
      decision: "confirmed",
      decisionNote: request.note || "Added and confirmed directly by the candidate in Pro Flow.",
      decidedAt,
    }],
  }, request.expectedRevision);
  return {
    profile: saved,
    summary: summarizeCanonicalReview(saved),
    compatibilityValid: await repository.verifyCompatibility(saved),
  };
}

export async function decideCanonicalFact(
  requestInput: EvidenceDecisionRequest,
): Promise<{
  profile: CanonicalCareerProfile;
  summary: CanonicalReviewSummary;
  compatibilityValid: boolean;
}> {
  const request = evidenceDecisionRequestSchema.parse(requestInput);

  const repository = store();
  const current = await repository.load();
  if (!current) throw new Error("The canonical career profile has not been created.");
  const working = current;
  const record = working.records.find((item) => item.id === request.factId);
  if (!record) throw new SourceEvidenceChangedError(request.factId);

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
