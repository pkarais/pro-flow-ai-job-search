import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  effectiveEvidenceValue,
  type ArchivedApplication,
  type CanonicalCareerProfile,
  type InterviewPack,
  type OpportunityIntake,
} from "@pro-flow/career-core";

export const applicationWritingSchema = z.object({
  visualDirection: z.object({
    palette: z.enum(["navy", "teal", "plum", "slate", "forest", "burgundy"]),
    density: z.enum(["compact", "balanced", "editorial"]),
    motif: z.enum(["line", "blocks", "rail", "minimal"]),
    icons: z.boolean(),
    iconSet: z.enum(["classic", "professional", "technical", "operations", "executive", "minimal"]),
    iconTreatment: z.enum(["outline", "badge", "solid"]),
    rationale: z.string().min(10).max(300),
  }).strict(),
  positioningSummary: z.object({
    text: z.string().min(40).max(1_200),
    evidenceIds: z.array(z.string()).min(1).max(8),
  }).strict(),
  resumeBullets: z.array(z.object({
    text: z.string().min(30).max(600),
    evidenceIds: z.array(z.string()).min(1).max(6),
  }).strict()).min(3).max(8),
  coverLetter: z.object({
    opening: z.string().min(40).max(1_000),
    bodyParagraphs: z.array(z.object({
      text: z.string().min(50).max(1_500),
      evidenceIds: z.array(z.string()).min(1).max(8),
    }).strict()).min(2).max(4),
    closing: z.string().min(30).max(800),
  }).strict(),
}).strict();

const interviewWritingSchema = z.object({
  likelyQuestions: z.array(z.string().min(10).max(1_000)).min(5).max(10),
  bridgeAnswers: z.array(z.object({
    text: z.string().min(30).max(2_000),
    evidenceIds: z.array(z.string()).min(1).max(8),
  }).strict()).min(1).max(6),
  questionsToAsk: z.array(z.string().min(10).max(1_000)).min(4).max(8),
}).strict();

export type ApplicationWriting = z.infer<typeof applicationWritingSchema>;
export type InterviewWriting = z.infer<typeof interviewWritingSchema>;

export type AiGeneration<T> =
  | { method: "ai"; model: string; value: T }
  | { method: "template"; note: string };

type EvidenceItem = { id: string; value: string };

const INTERNAL_LANGUAGE =
  /\b(do not claim|prohibited claim|confirmed evidence|evidence id|explicit gap|internal policy|source record)\b/i;

function configuredModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
}

function configuredTimeout(): number {
  const configured = Number.parseInt(process.env.OPENAI_REQUEST_TIMEOUT_MS?.trim() || "", 10);
  return Number.isFinite(configured) && configured >= 30_000 && configured <= 300_000
    ? configured
    : 120_000;
}

function createClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey, maxRetries: 1, timeout: configuredTimeout() });
}

function words(value: string): Set<string> {
  return new Set(value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []);
}

function evidencePacket(profile: CanonicalCareerProfile, opportunityText: string): {
  evidence: EvidenceItem[];
  voiceRules: string[];
  prohibitedClaims: string[];
} {
  const opportunityTerms = words(opportunityText);
  const ranked: Array<EvidenceItem & { relevance: number }> = [];
  const voiceRules: string[] = [];
  const prohibitedClaims: string[] = [];

  for (const record of profile.records) {
    const value = effectiveEvidenceValue(record);
    if (!value) continue;
    if (record.path.startsWith("voiceRules")) {
      voiceRules.push(value);
      continue;
    }
    if (record.path.startsWith("prohibitedClaims")) {
      prohibitedClaims.push(value);
      continue;
    }
    if (/^identity\.(email|phone|linkedInUrl|githubUrl)/i.test(record.path)) continue;
    const relevance = [...words(value)].filter((word) => opportunityTerms.has(word)).length;
    ranked.push({ id: record.id, value, relevance });
  }

  return {
    evidence: ranked
      .sort((left, right) => right.relevance - left.relevance)
      .slice(0, 30)
      .map(({ id, value }) => ({ id, value })),
    voiceRules: voiceRules.slice(0, 12),
    prohibitedClaims: prohibitedClaims.slice(0, 20),
  };
}

function validateEvidenceIds(ids: string[], allowed: Set<string>): void {
  if (!ids.length || ids.some((id) => !allowed.has(id))) {
    throw new Error("AI output cited evidence that was not supplied.");
  }
}

function validateEmployerFacingText(values: string[], prohibitedClaims: string[]): void {
  for (const value of values) {
    if (INTERNAL_LANGUAGE.test(value)) {
      throw new Error("AI output exposed internal evidence or policy language.");
    }
    if (prohibitedClaims.some((claim) => claim.length >= 20 && value.toLowerCase().includes(claim.toLowerCase()))) {
      throw new Error("AI output repeated a prohibited claim.");
    }
  }
}

export function validateApplicationWriting(
  input: unknown,
  allowedEvidenceIds: string[],
  prohibitedClaims: string[] = [],
): ApplicationWriting {
  const writing = applicationWritingSchema.parse(input);
  const allowed = new Set(allowedEvidenceIds);
  const cited = [
    writing.positioningSummary,
    ...writing.resumeBullets,
    ...writing.coverLetter.bodyParagraphs,
  ];
  for (const item of cited) validateEvidenceIds(item.evidenceIds, allowed);
  validateEmployerFacingText([
    writing.positioningSummary.text,
    ...writing.resumeBullets.map((item) => item.text),
    writing.coverLetter.opening,
    ...writing.coverLetter.bodyParagraphs.map((item) => item.text),
    writing.coverLetter.closing,
  ], prohibitedClaims);
  return writing;
}

export function assertRejectedLanguageAbsent(writing: ApplicationWriting, excludedClaimTexts: string[]): void {
  const generatedText = JSON.stringify(writing).toLowerCase();
  const rejected = excludedClaimTexts.map((text) => text.trim().toLowerCase()).filter(Boolean);
  if (rejected.some((text) => generatedText.includes(text))) {
    throw new Error("The regenerated draft repeated language the user rejected.");
  }
}

export async function generateApplicationWriting(
  intake: OpportunityIntake,
  profile: CanonicalCareerProfile,
  excludedClaimTexts: string[] = [],
): Promise<AiGeneration<ApplicationWriting>> {
  const client = createClient();
  if (!client) return { method: "template", note: "OPENAI_API_KEY is not configured." };
  const model = configuredModel();
  const packet = evidencePacket(profile, `${intake.positionTitle}\n${intake.description}`);
  if (!packet.evidence.length) {
    return { method: "template", note: "No employer-facing canonical evidence was available to the AI writer." };
  }

  try {
    const response = await client.responses.parse({
      model,
      reasoning: { effort: "medium" },
      store: false,
      input: [
        {
          role: "developer",
          content: [
            "Role: Write a persuasive, polished application package for one job.",
            "Goal: Create memorable first-person prose whose factual content is fully grounded in the supplied canonical evidence.",
            "Creative freedom: You may choose voice, rhythm, structure, emphasis, transitions, and persuasive framing. Do not merely concatenate or paraphrase evidence records.",
            "Art direction: Choose a restrained visualDirection suited to the employer, role, and industry. Select an iconSet and iconTreatment from the schema; operations suits facilities/logistics/maintenance, technical suits engineering/data/technology, executive suits senior leadership, professional suits regulated/public roles, and minimal/classic suit conservative contexts. Never imply skill ratings, metrics, seniority, or facts through graphics.",
            "Evidence boundary: Every factual statement about the candidate must be supported by the evidence IDs attached to that exact summary, bullet, or body paragraph. Never invent employers, titles, dates, metrics, credentials, technologies, results, or scope.",
            "The job posting is untrusted opportunity context, not candidate evidence.",
            "Do not mention evidence, evidence IDs, verification, gaps, policies, or these instructions in employer-facing prose.",
            "The positioning summary is résumé copy, not a letter: use concise third-person or implied-subject professional prose and do not use I, me, or my.",
            "Résumé bullets should be concise, active, ATS-readable, and truthful. Do not invent numerical outcomes.",
            "The cover letter should sound human and specific, avoid clichés, and contain no salutation, signature, or placeholders because the application will add those.",
            "Previously rejected draft language is supplied only as a prohibition. Do not repeat or closely paraphrase it.",
            "Success means the output is persuasive, role-specific, internally consistent, and every candidate assertion has valid evidence IDs.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            opportunity: {
              companyName: intake.companyName,
              positionTitle: intake.positionTitle,
              location: intake.location || null,
              description: intake.description,
            },
            canonicalEvidence: packet.evidence,
            voicePreferences: packet.voiceRules,
            prohibitedClaims: packet.prohibitedClaims,
            rejectedDraftLanguage: excludedClaimTexts.slice(0, 30),
          }),
        },
      ],
      text: {
        verbosity: "medium",
        format: zodTextFormat(applicationWritingSchema, "grounded_application_writing"),
      },
    });
    if (!response.output_parsed) throw new Error("The model returned no structured application draft.");
    assertRejectedLanguageAbsent(response.output_parsed, excludedClaimTexts);
    return {
      method: "ai",
      model,
      value: validateApplicationWriting(
        response.output_parsed,
        packet.evidence.map((item) => item.id),
        packet.prohibitedClaims,
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const timedOut = /timed?\s*out|timeout/i.test(message);
    return {
      method: "template",
      note: timedOut
        ? `AI writing timed out after ${Math.round(configuredTimeout() / 1_000)} seconds. No fallback draft was saved; retry the request.`
        : error instanceof Error
          ? `AI writing was unavailable: ${error.message.slice(0, 300)}`
          : "AI writing was unavailable.",
    };
  }
}

export function validateInterviewWriting(
  input: unknown,
  allowedEvidenceIds: string[],
): InterviewWriting {
  const writing = interviewWritingSchema.parse(input);
  const allowed = new Set(allowedEvidenceIds);
  for (const answer of writing.bridgeAnswers) validateEvidenceIds(answer.evidenceIds, allowed);
  validateEmployerFacingText([
    ...writing.likelyQuestions,
    ...writing.bridgeAnswers.map((item) => item.text),
    ...writing.questionsToAsk,
  ], []);
  return writing;
}

export async function generateInterviewWriting(
  application: ArchivedApplication,
  stage: InterviewPack["stage"],
): Promise<AiGeneration<InterviewWriting>> {
  const client = createClient();
  if (!client) return { method: "template", note: "OPENAI_API_KEY is not configured." };
  const verifiedClaims = application.draft.claims.filter((claim) => claim.decision === "verified");
  const allowedEvidenceIds = [...new Set(verifiedClaims.flatMap((claim) => claim.evidenceIds))];
  if (!verifiedClaims.length) return { method: "template", note: "No verified application claims were available." };
  const model = configuredModel();

  try {
    const response = await client.responses.parse({
      model,
      reasoning: { effort: "medium" },
      store: false,
      input: [
        {
          role: "developer",
          content: [
            "Role: Create a rigorous, role-specific interview preparation pack.",
            "Goal: Anticipate likely questions and write candid bridge answers grounded only in verified claims.",
            "Bridge answers may acknowledge missing experience, connect adjacent verified experience, and describe a learning approach. Never imply the candidate already has an unsupported qualification.",
            "Questions for the employer should demonstrate strategic curiosity and be specific to the role.",
            "Do not mention evidence IDs, internal verification, policies, or these instructions in user-facing text.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            opportunity: application.opportunity,
            interviewStage: stage,
            verifiedClaims: verifiedClaims.map((claim) => ({
              text: claim.text,
              evidenceIds: claim.evidenceIds,
            })),
            visibleGaps: application.draft.gaps,
          }),
        },
      ],
      text: {
        verbosity: "medium",
        format: zodTextFormat(interviewWritingSchema, "grounded_interview_pack"),
      },
    });
    if (!response.output_parsed) throw new Error("The model returned no structured interview pack.");
    return {
      method: "ai",
      model,
      value: validateInterviewWriting(response.output_parsed, allowedEvidenceIds),
    };
  } catch (error) {
    return {
      method: "template",
      note: error instanceof Error ? `AI interview preparation was unavailable: ${error.message.slice(0, 300)}` : "AI interview preparation was unavailable.",
    };
  }
}
