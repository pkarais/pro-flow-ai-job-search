import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  recordIdSchema,
} from "./common.ts";

export const opportunitySchema = z
  .object({
    id: recordIdSchema,
    source: nonEmptyTextSchema.max(120),
    externalId: z.string().trim().max(300).optional(),
    companyName: nonEmptyTextSchema.max(200),
    positionTitle: nonEmptyTextSchema.max(200),
    location: z.string().trim().max(300).optional(),
    workMode: z.enum(["onsite", "hybrid", "remote", "unspecified"]),
    description: nonEmptyTextSchema.max(50_000),
    url: z.url().max(2_000).optional(),
    publishedAt: isoDateTimeSchema.optional(),
    deadline: z.string().trim().max(80).optional(),
    capturedAt: isoDateTimeSchema,
  })
  .strict();

export const fitDimensionSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    explanation: nonEmptyTextSchema.max(4_000),
    evidenceIds: z.array(recordIdSchema),
    gaps: z.array(nonEmptyTextSchema.max(1_000)),
  })
  .strict();

export const fitAssessmentSchema = z
  .object({
    opportunityId: recordIdSchema,
    overallScore: z.number().int().min(0).max(100),
    recommendation: z.enum(["apply", "consider", "save", "do_not_apply"]),
    eligibility: z
      .object({
        status: z.enum(["eligible", "uncertain", "ineligible"]),
        explanation: nonEmptyTextSchema.max(4_000),
      })
      .strict(),
    dimensions: z
      .object({
        skills: fitDimensionSchema,
        experience: fitDimensionSchema,
        seniority: fitDimensionSchema,
        preferences: fitDimensionSchema,
      })
      .strict(),
    strongestEvidenceIds: z.array(recordIdSchema),
    unresolvedQuestions: z.array(nonEmptyTextSchema.max(1_000)),
    assessedAt: isoDateTimeSchema,
  })
  .strict();

export type Opportunity = z.infer<typeof opportunitySchema>;
export type FitAssessment = z.infer<typeof fitAssessmentSchema>;
export type FitDimension = z.infer<typeof fitDimensionSchema>;
