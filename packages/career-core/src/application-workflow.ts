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
  decision: z.enum(["pending", "verified", "do_not_use"]),
  reviewedAt: isoDateTimeSchema.optional(),
}).strict();

export const applicationDraftSchema = z.object({
  summary: nonEmptyTextSchema.max(8_000),
  coverLetter: nonEmptyTextSchema.max(20_000),
  matchedKeywords: z.array(nonEmptyTextSchema.max(200)),
  gaps: z.array(nonEmptyTextSchema.max(500)),
  claims: z.array(archivedClaimSchema),
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
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}).strict();

export const claimDecisionRequestSchema = z.object({
  applicationId: recordIdSchema,
  claimId: recordIdSchema,
  expectedRevision: z.number().int().positive(),
  decision: z.enum(["verified", "do_not_use"]),
}).strict();

export type OpportunityIntake = z.infer<typeof opportunityIntakeSchema>;
export type ArchivedClaim = z.infer<typeof archivedClaimSchema>;
export type ApplicationDraft = z.infer<typeof applicationDraftSchema>;
export type ArchivedApplication = z.infer<typeof archivedApplicationSchema>;
export type ClaimDecisionRequest = z.infer<typeof claimDecisionRequestSchema>;
