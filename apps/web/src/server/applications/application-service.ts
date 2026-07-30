import { createHash, randomUUID } from "node:crypto";
import {
  archivedApplicationSchema,
  effectiveEvidenceValue,
  opportunityIntakeSchema,
  type ArchivedApplication,
  type CanonicalCareerProfile,
  type OpportunityIntake,
} from "@pro-flow/career-core";

const STOP_WORDS = new Set([
  "and", "the", "with", "for", "that", "this", "from", "your", "you", "our",
  "are", "will", "have", "has", "into", "their", "they", "but", "not", "job",
  "role", "team", "work", "years", "experience", "skills", "about", "who",
]);

function terms(value: string): string[] {
  return [...new Set(
    value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)
      ?.filter((word) => !STOP_WORDS.has(word)) ?? [],
  )];
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

export function buildApplication(
  intakeInput: OpportunityIntake,
  profile: CanonicalCareerProfile,
  now = new Date(),
): ArchivedApplication {
  const intake = opportunityIntakeSchema.parse(intakeInput);
  const evidence = profile.records.flatMap((record) => {
    const value = effectiveEvidenceValue(record);
    const employerFacing = !record.path.startsWith("voiceRules")
      && !record.path.startsWith("prohibitedClaims");
    return value && employerFacing ? [{ id: record.id, value }] : [];
  });
  if (evidence.length === 0) {
    throw new Error("Confirm or correct at least one career evidence item before starting an application.");
  }

  const postingTerms = terms(`${intake.positionTitle} ${intake.description}`);
  const evidenceTerms = new Set(terms(evidence.map((item) => item.value).join(" ")));
  const matchedKeywords = postingTerms.filter((term) => evidenceTerms.has(term)).slice(0, 20);
  const gaps = postingTerms.filter((term) => !evidenceTerms.has(term)).slice(0, 12);
  const score = Math.min(100, Math.round((matchedKeywords.length / Math.max(1, matchedKeywords.length + gaps.length)) * 100));
  const recommendation = score >= 65 ? "apply" : score >= 40 ? "consider" : "save";
  const timestamp = now.toISOString();
  const applicationId = `app_${now.getTime()}_${randomUUID().slice(0, 8)}`;
  const rankedEvidence = evidence
    .map((item) => ({
      ...item,
      relevance: terms(item.value).filter((term) => postingTerms.includes(term)).length,
    }))
    .sort((left, right) => right.relevance - left.relevance);
  const strongest = rankedEvidence.filter((item) => item.relevance > 0).slice(0, 5);
  if (strongest.length === 0) {
    throw new Error("No confirmed career evidence supports this posting yet. Review the visible gaps before drafting.");
  }
  const claims = strongest.map((item) => ({
    id: stableId("claim", `${applicationId}:${item.id}`),
    text: item.value,
    evidenceIds: [item.id],
    decision: "pending" as const,
  }));
  const evidenceNarrative = strongest.map((item) => item.value).join(" ");
  const gapCopy = gaps.length
    ? `The posting also emphasizes ${gaps.slice(0, 5).join(", ")}; these remain explicit gaps until supported.`
    : "No material keyword gaps were detected by the local comparison.";

  return archivedApplicationSchema.parse({
    schemaVersion: 1,
    id: applicationId,
    revision: 1,
    profileRevision: profile.revision,
    status: "factual_review",
    opportunity: {
      id: stableId("opp", `${intake.companyName}:${intake.positionTitle}:${intake.description}`),
      source: "manual",
      companyName: intake.companyName,
      positionTitle: intake.positionTitle,
      location: intake.location || undefined,
      workMode: "unspecified",
      description: intake.description,
      url: intake.url || undefined,
      capturedAt: timestamp,
    },
    fit: {
      opportunityId: stableId("opp", `${intake.companyName}:${intake.positionTitle}:${intake.description}`),
      overallScore: score,
      recommendation,
      eligibility: {
        status: "uncertain",
        explanation: "Eligibility must be confirmed by the user; the posting is treated only as untrusted evaluation data.",
      },
      dimensions: {
        skills: { score, explanation: `${matchedKeywords.length} supported posting terms matched confirmed evidence.`, evidenceIds: strongest.map((item) => item.id), gaps },
        experience: { score, explanation: "Confirmed career evidence was compared with the posting language.", evidenceIds: strongest.map((item) => item.id), gaps: [] },
        seniority: { score: 50, explanation: "Seniority requires human review of scope and level.", evidenceIds: [], gaps: ["Confirm level alignment"] },
        preferences: { score: 50, explanation: "Location and work-mode preferences require human review.", evidenceIds: [], gaps: ["Confirm location and work mode"] },
      },
      strongestEvidenceIds: strongest.map((item) => item.id),
      unresolvedQuestions: ["Confirm eligibility, seniority, location, and any unsupported requirements."],
      assessedAt: timestamp,
    },
    draft: {
      summary: `Draft positioning for ${intake.positionTitle} at ${intake.companyName}: ${evidenceNarrative}`,
      coverLetter: `Dear Hiring Manager,\n\nI am interested in the ${intake.positionTitle} role at ${intake.companyName}. My relevant, confirmed background includes: ${evidenceNarrative}\n\n${gapCopy}\n\nSincerely`,
      matchedKeywords,
      gaps,
      claims,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
