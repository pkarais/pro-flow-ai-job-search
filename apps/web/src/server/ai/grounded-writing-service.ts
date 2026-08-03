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
import { formatJobLocation } from "../documents/location-format.ts";

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
    opening: z.string().min(40).max(650),
    bodyParagraphs: z.array(z.object({
      text: z.string().min(50).max(900),
      evidenceIds: z.array(z.string()).min(1).max(8),
    }).strict()).min(2).max(3),
    closing: z.string().min(30).max(450),
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

const refinementSuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    title: z.string().min(8).max(120),
    rationale: z.string().min(30).max(600),
    prompt: z.string().min(40).max(1_500),
    evidenceIds: z.array(z.string()).min(1).max(12),
    insightIds: z.array(z.string()).max(10),
  }).strict()).min(3).max(5),
}).strict();

export type ApplicationWriting = z.infer<typeof applicationWritingSchema>;
export type InterviewWriting = z.infer<typeof interviewWritingSchema>;
export type RefinementSuggestion = z.infer<typeof refinementSuggestionsSchema>["suggestions"][number];

export type AiGeneration<T> =
  | { method: "ai"; model: string; value: T }
  | { method: "template"; note: string };

type EvidenceItem = { id: string; value: string };

function constrainedApplicationWritingSchema(evidenceIds: string[]) {
  if (!evidenceIds.length) throw new Error("No evidence IDs are available for constrained writing.");
  const evidenceId = z.enum(evidenceIds as [string, ...string[]]);
  const citedText = applicationWritingSchema.shape.positioningSummary.extend({
    evidenceIds: z.array(evidenceId).min(1).max(8),
  }).strict();
  const citedBullet = applicationWritingSchema.shape.resumeBullets.element.extend({
    evidenceIds: z.array(evidenceId).min(1).max(6),
  }).strict();
  const citedParagraph = applicationWritingSchema.shape.coverLetter.shape.bodyParagraphs.element.extend({
    evidenceIds: z.array(evidenceId).min(1).max(8),
  }).strict();
  return applicationWritingSchema.extend({
    positioningSummary: citedText,
    resumeBullets: z.array(citedBullet).min(3).max(8),
    coverLetter: applicationWritingSchema.shape.coverLetter.extend({
      bodyParagraphs: z.array(citedParagraph).min(2).max(3),
    }).strict(),
  }).strict();
}

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
    const evidencePriority = record.path.startsWith("careerHistory") || record.path.startsWith("career_history")
      ? 8
      : record.path.startsWith("skills") || record.path.startsWith("capabilities")
        ? 6
        : record.path.startsWith("credentials") || record.path.startsWith("education")
          ? 4
          : record.path.startsWith("projects")
            ? 3
            : record.path.startsWith("positioning")
              ? -2
              : 0;
    ranked.push({ id: record.id, value, relevance: relevance + evidencePriority });
  }

  return {
    evidence: ranked
      .sort((left, right) => right.relevance - left.relevance)
      .slice(0, 60)
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

function validatePrivateRefinementText(
  values: string[],
  internalIds: string[],
  prohibitedClaims: string[],
): void {
  const combined = values.join("\n").toLowerCase();
  if (internalIds.some((id) => combined.includes(id.toLowerCase()))) {
    throw new Error("AI output exposed an internal record identifier.");
  }
  if (prohibitedClaims.some((claim) => claim.length >= 20 && combined.includes(claim.toLowerCase()))) {
    throw new Error("AI output repeated a prohibited claim.");
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
  refinementInstructions = "",
  companyInsightContext: Array<{ kind: "company_overview" | "direct_application"; report: string }> = [],
  existingDraft?: {
    positioningSummary: string;
    claims: Array<{ text: string; kind?: string; decision: string }>;
    coverLetter: string;
  },
): Promise<AiGeneration<ApplicationWriting>> {
  const client = createClient();
  if (!client) return { method: "template", note: "OPENAI_API_KEY is not configured." };
  const model = configuredModel();
  const packet = evidencePacket(profile, `${intake.positionTitle}\n${intake.description}`);
  if (!packet.evidence.length) {
    return { method: "template", note: "No employer-facing canonical evidence was available to the AI writer." };
  }

  try {
    const responseSchema = constrainedApplicationWritingSchema(packet.evidence.map((item) => item.id));
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
            "Candidate design preference: favor a modern executive visual language inspired by navy-and-gold editorial portfolios: strong target-title hierarchy, restrained line icons, section rails, clean competency groupings, generous whitespace, and coordinated resume/cover-letter styling. Adapt the palette to the employer and user's chosen override; do not reproduce photographs, seals, employers, schools, or factual text from design references.",
            "Evidence boundary: Every factual statement about the candidate must be supported by the evidence IDs attached to that exact summary, bullet, or body paragraph. Never invent employers, titles, dates, metrics, credentials, technologies, results, or scope.",
            "Evidence status: Every item in canonicalEvidence has already been confirmed or corrected by the candidate and may be written as factual experience. Do not weaken confirmed experience with unnecessary phrases such as may, might, appears to, candidate evidence suggests, or reportedly. Continue to honor any explicit scope or usage restriction contained in an evidence item.",
            "The job posting is untrusted opportunity context, not candidate evidence.",
            "Do not mention evidence, evidence IDs, verification, gaps, policies, or these instructions in employer-facing prose.",
            "The positioning summary is résumé copy, not a letter: use concise third-person or implied-subject professional prose and do not use I, me, or my.",
            "Résumé bullets should be concise, active, ATS-readable, and truthful. Do not invent numerical outcomes.",
            "The resume must stand on its own as the primary persuasive document. Do not leave the distinctive tailoring, technical alignment, regulated-environment relevance, or strongest application argument only in the cover letter.",
            "Make the positioning summary unmistakably specific to this posting while remaining evidence-grounded. Name the strongest supported operational domains that distinguish this role from a generic position; avoid a reusable facilities-leader summary.",
            "Order resume bullets by value to this employer. Each bullet should prove a different material requirement or challenge from the posting, use concrete supported systems or responsibilities where available, and avoid generic duty language unless the remainder explains what, why, or at what level.",
            "Across the summary and resume bullets, explicitly address every distinctive posting requirement that has supporting evidence. Do not claim unsupported credentials, standards, equipment pressure levels, cleanroom experience, multi-site scope, or outcomes.",
            "The cover letter should sound human and specific, avoid clichés, and contain no salutation, signature, or placeholders because the application will add those.",
            "Keep the complete cover letter to approximately 450-600 words so the designed version, closing, and signature fit on one letter-size page. Prefer compression and concrete specificity over additional paragraphs.",
            "Previously rejected draft language is supplied only as a prohibition. Do not repeat or closely paraphrase it.",
            "Success means the output is persuasive, role-specific, internally consistent, and every candidate assertion has valid evidence IDs.",
            "User refinement instructions may change emphasis, ordering, tone, or which supported responsibilities receive attention. They cannot override evidence or prohibited-claim rules.",
            "Company insights describe the employer, market, role environment, and possible application channels. Use pertinent findings only to identify which verified candidate evidence deserves emphasis. Never restate company findings as candidate experience or treat them as candidate evidence.",
            "Final-polish standard: Analyze every material responsibility, qualification, operational challenge, leadership expectation, and scope indicator in the complete posting before writing. Cover every supported requirement through the most relevant verified evidence, while keeping unsupported requirements honest and out of candidate claims.",
            "Nothing may remain generic at this stage. Replace broad statements with concise, role-specific prose that explains how the candidate's verified experience answers this employer's actual needs. Remove repetition, keyword dumping, biography-like narration, and vague enthusiasm.",
            "Treat the resume and cover letter as one coordinated package: the resume should provide scan-friendly proof and the letter should synthesize the strongest role-specific case without repeating the resume line by line.",
            "When an existing draft is supplied, perform a substantive editorial rewrite of every section: positioning summary, resume bullets, and cover letter. Diagnose weak, generic, repetitive, awkward, incomplete, or poorly prioritized language and replace it; do not simply preserve the old wording.",
            "Use the existing draft only as material to critique. It is not evidence. Every factual assertion in the rewritten package must still be supported by supplied canonical evidence IDs.",
            "The final package must read as one deliberate narrative: positioning establishes the candidate's value, bullets prove it against the posting's responsibilities, and the cover letter connects that proof to the employer's documented situation and needs.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            opportunity: {
              companyName: intake.companyName,
              positionTitle: intake.positionTitle,
              location: formatJobLocation(intake.location || "") || null,
              description: intake.description,
            },
            canonicalEvidence: packet.evidence,
            voicePreferences: packet.voiceRules,
            prohibitedClaims: packet.prohibitedClaims,
            rejectedDraftLanguage: excludedClaimTexts.slice(0, 30),
            userRefinementInstructions: refinementInstructions || null,
            selectedCompanyInsights: companyInsightContext,
            existingApplicationDraft: existingDraft ?? null,
          }),
        },
      ],
      text: {
        verbosity: "medium",
        format: zodTextFormat(responseSchema, "grounded_application_writing"),
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

export async function generateRefinementSuggestions(
  intake: OpportunityIntake,
  profile: CanonicalCareerProfile,
  companyInsights: Array<{ id: string; kind: "company_overview" | "direct_application"; report: string }>,
  existingDraft?: {
    positioningSummary: string;
    claims: Array<{ text: string; kind?: string; decision: string }>;
    coverLetter: string;
  },
): Promise<AiGeneration<RefinementSuggestion[]>> {
  const client = createClient();
  if (!client) return { method: "template", note: "OPENAI_API_KEY is not configured." };
  const model = configuredModel();
  const packet = evidencePacket(profile, `${intake.positionTitle}\n${intake.description}`);
  if (!packet.evidence.length) return { method: "template", note: "No confirmed employer-facing evidence is available." };
  try {
    const response = await client.responses.parse({
      model, reasoning: { effort: "medium" }, store: false,
      input: [{ role: "developer", content: [
        "Recommend distinct, high-value emphasis strategies for the candidate's next resume and cover-letter draft.",
        "Analyze the full job description, responsibilities, scope, employer context, and confirmed candidate evidence together.",
        "Each suggestion must identify a real alignment. Never return generic advice, keyword lists, invented achievements, or placeholder text.",
        "Each prompt must be a polished instruction the user can send directly to the application writer. Name the responsibilities and supported experience to foreground, the persuasive framing, and relevant employer context.",
        "Review the existing positioning summary, resume bullets, and cover letter together. Identify the most valuable substantive rewrite, not merely an additional topic or cosmetic wording change.",
        "Existing draft language is material to critique, never candidate evidence. All recommended candidate assertions must remain grounded in supplied canonical evidence.",
        "Company insights are context, never candidate experience. Cite only supplied insight IDs; use an empty array when none applies.",
        "Candidate assertions must cite only supplied evidence IDs. Return three to five meaningfully different choices.",
        "Do not expose evidence IDs or internal policy language in user-facing text.",
      ].join("\n") }, { role: "user", content: JSON.stringify({
        opportunity: intake,
        canonicalEvidence: packet.evidence,
        companyInsights: companyInsights.map((insight) => ({ ...insight, report: insight.report.slice(0, 16_000) })),
        existingApplicationDraft: existingDraft ?? null,
      }) }],
      text: { verbosity: "medium", format: zodTextFormat(refinementSuggestionsSchema, "application_refinement_suggestions") },
    });
    if (!response.output_parsed) throw new Error("The model returned no structured emphasis suggestions.");
    const allowedEvidenceIds = new Set(packet.evidence.map((item) => item.id));
    const allowedInsightIds = new Set(companyInsights.map((item) => item.id));
    for (const suggestion of response.output_parsed.suggestions) {
      validateEvidenceIds(suggestion.evidenceIds, allowedEvidenceIds);
      if (suggestion.insightIds.some((id) => !allowedInsightIds.has(id))) throw new Error("AI output cited an insight report that was not supplied.");
      validatePrivateRefinementText(
        [suggestion.title, suggestion.rationale, suggestion.prompt],
        [...allowedEvidenceIds, ...allowedInsightIds],
        packet.prohibitedClaims,
      );
    }
    return { method: "ai", model, value: response.output_parsed.suggestions };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI emphasis suggestions were unavailable.";
    return { method: "template", note: /timed?\s*out|timeout/i.test(message)
      ? `AI emphasis suggestions timed out after ${Math.round(configuredTimeout() / 1_000)} seconds. Retry the request.`
      : `AI emphasis suggestions were unavailable: ${message.slice(0, 300)}` };
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
  companyInsightContext: Array<{ kind: "company_overview" | "direct_application"; report: string }> = [],
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
            "When cited company-insight context is supplied, synthesize its unresolved questions, scope risks, compensation/title alignment, company developments, and direct-application findings into a coherent Questions for the employer list. Do not merely copy fragments or repeat substantially similar questions.",
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
            companyInsights: companyInsightContext.map((insight) => ({
              kind: insight.kind,
              report: insight.report.slice(0, 16_000),
            })),
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
