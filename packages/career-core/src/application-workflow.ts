import { z } from "zod";
import { isoDateTimeSchema, nonEmptyTextSchema, recordIdSchema } from "./common.js";
import { fitAssessmentSchema, opportunitySchema } from "./opportunity.js";

export const opportunityIntakeSchema = z.object({
  companyName: nonEmptyTextSchema.max(200),
  positionTitle: nonEmptyTextSchema.max(200),
  location: z.string().trim().max(300).optional(),
  description: nonEmptyTextSchema.min(120).max(50_000),
  url: z.union([z.literal(""), z.url().max(2_000)]).optional(),
}).strict();

export const archivedClaimSchema = z.object({
  id: recordIdSchema,
  text: nonEmptyTextSchema.max(4_000),
  evidenceIds: z.array(recordIdSchema).min(1),
  kind: z.enum(["summary", "resume_bullet", "cover_letter"]).optional(),
  decision: z.enum(["pending", "verified", "do_not_use"]),
  reviewedAt: isoDateTimeSchema.optional(),
}).strict();

export const generationMetadataSchema = z.object({
  method: z.enum(["ai", "template"]),
  model: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1_000).optional(),
  visualDirection: z.object({
    palette: z.enum(["navy", "teal", "plum", "slate", "forest", "burgundy"]),
    density: z.enum(["compact", "balanced", "editorial"]),
    motif: z.enum(["line", "blocks", "rail", "minimal"]),
    icons: z.boolean(),
    iconSet: z.enum(["classic", "professional", "technical", "operations", "executive", "minimal"]),
    iconTreatment: z.enum(["outline", "badge", "solid"]),
    rationale: z.string().trim().min(10).max(300),
  }).strict().optional(),
}).strict();

export const applicationDraftSchema = z.object({
  summary: nonEmptyTextSchema.max(8_000),
  coverLetter: nonEmptyTextSchema.max(20_000),
  matchedKeywords: z.array(nonEmptyTextSchema.max(200)),
  gaps: z.array(nonEmptyTextSchema.max(500)),
  claims: z.array(archivedClaimSchema),
  generation: generationMetadataSchema.optional(),
}).strict();

export const archivedApplicationSchema = z.object({
  schemaVersion: z.literal(1),
  id: recordIdSchema,
  revision: z.number().int().positive(),
  profileRevision: z.number().int().positive(),
  status: z.enum(["factual_review", "review_complete"]),
  opportunity: opportunitySchema,
  fit: fitAssessmentSchema,
  draft: applicationDraftSchema,
  draftHistory: z.array(z.object({
    revision: z.number().int().positive(),
    archivedAt: isoDateTimeSchema,
    draft: applicationDraftSchema,
  }).strict()).max(20).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}).strict();

export const claimDecisionRequestSchema = z.object({
  applicationId: recordIdSchema,
  claimId: recordIdSchema,
  expectedRevision: z.number().int().positive(),
  decision: z.enum(["verified", "do_not_use"]),
}).strict();

export const regenerateDraftRequestSchema = z.object({
  applicationId: recordIdSchema,
  expectedRevision: z.number().int().positive(),
}).strict();

export type OpportunityIntake = z.infer<typeof opportunityIntakeSchema>;
export type ArchivedClaim = z.infer<typeof archivedClaimSchema>;
export type ApplicationDraft = z.infer<typeof applicationDraftSchema>;
export type ArchivedApplication = z.infer<typeof archivedApplicationSchema>;
export type ClaimDecisionRequest = z.infer<typeof claimDecisionRequestSchema>;
export type RegenerateDraftRequest = z.infer<typeof regenerateDraftRequestSchema>;
