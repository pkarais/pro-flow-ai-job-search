import { createHash, randomUUID } from "node:crypto";
import {
  archivedApplicationSchema,
  effectiveEvidenceValue,
  opportunityIntakeSchema,
  type ArchivedApplication,
  type CanonicalCareerProfile,
  type OpportunityIntake,
} from "@pro-flow/career-core";
import type { AiGeneration, ApplicationWriting } from "../ai/grounded-writing-service";

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

function readableList(values: string[]): string {
  const cleaned = values.map((value) => value.replaceAll("-", " "));
  if (cleaned.length <= 1) return cleaned[0] ?? "";
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned.at(-1)}`;
}

function buildCoverLetter(
  intake: OpportunityIntake,
  matchedKeywords: string[],
): string {
  const alignment = readableList(matchedKeywords.slice(0, 8));
  const alignmentParagraph = alignment
    ? `My confirmed experience aligns with several priorities in the posting, including ${alignment}. I would bring a practical, systems-oriented approach to coordinating work, improving operational clarity, and supporting accountable execution.`
    : "I would bring a practical, systems-oriented approach to coordinating work, improving operational clarity, and supporting accountable execution.";

  return [
    "Dear Hiring Manager,",
    `I am writing to express my interest in the ${intake.positionTitle} position at ${intake.companyName}. The opportunity to contribute to this work is a strong match for the direction of my career and the operational challenges I am prepared to take on.`,
    alignmentParagraph,
    `I would welcome the opportunity to discuss how my background could support ${intake.companyName}'s goals. Thank you for your time and consideration.`,
    "Sincerely,",
    "[Your name]",
  ].join("\n\n");
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
  const alignment = readableList(matchedKeywords.slice(0, 8));
  const positioningSummary = alignment
    ? `Candidate evidence supports relevant experience in ${alignment} for the ${intake.positionTitle} opportunity.`
    : `Confirmed career evidence is available for review against the ${intake.positionTitle} opportunity.`;

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
      summary: positioningSummary,
      coverLetter: buildCoverLetter(intake, matchedKeywords),
      matchedKeywords,
      gaps,
      claims: claims.map((claim) => ({ ...claim, kind: "resume_bullet" as const })),
      generation: {
        method: "template",
        note: "Deterministic local fallback draft.",
      },
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function applyAiWriting(
  application: ArchivedApplication,
  generation: AiGeneration<ApplicationWriting>,
): ArchivedApplication {
  if (generation.method !== "ai") {
    return archivedApplicationSchema.parse({
      ...application,
      draft: {
        ...application.draft,
        generation: {
          method: "template",
          note: generation.note,
        },
      },
    });
  }

  const writing = generation.value;
  const priorPackageWasApproved = application.status === "review_complete";
  const previouslyVerifiedEvidence = new Set<string>();
  for (const claim of application.draft.claims.filter((item) => item.decision === "verified")) {
    claim.evidenceIds.forEach((id) => previouslyVerifiedEvidence.add(id));
  }
  const claimInputs = [
    {
      text: writing.positioningSummary.text,
      evidenceIds: writing.positioningSummary.evidenceIds,
      kind: "summary" as const,
    },
    ...writing.resumeBullets.map((item) => ({ ...item, kind: "resume_bullet" as const })),
    ...writing.coverLetter.bodyParagraphs.map((item) => ({ ...item, kind: "cover_letter" as const })),
  ];
  const claims = claimInputs.map((claim, index) => {
    const retainsApproval = priorPackageWasApproved || claim.evidenceIds.every((id) => previouslyVerifiedEvidence.has(id));
    return {
      id: stableId("claim", `${application.id}:ai:${index}:${claim.text}`),
      ...claim,
      decision: retainsApproval ? "verified" as const : "pending" as const,
      ...(retainsApproval ? { reviewedAt: new Date().toISOString() } : {}),
    };
  });
  const coverLetter = [
    "Dear Hiring Manager,",
    writing.coverLetter.opening,
    ...writing.coverLetter.bodyParagraphs.map((item) => item.text),
    writing.coverLetter.closing,
    "Sincerely,",
    "[Your name]",
  ].join("\n\n");

  return archivedApplicationSchema.parse({
    ...application,
    draft: {
      ...application.draft,
      summary: writing.positioningSummary.text,
      coverLetter,
      claims,
      generation: {
        method: "ai",
        model: generation.model,
        visualDirection: writing.visualDirection,
      },
    },
  });
}
