import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  recordIdSchema,
} from "./common.ts";

export const factualClaimSchema = z
  .object({
    id: recordIdSchema,
    claim: nonEmptyTextSchema.max(4_000),
    evidenceIds: z.array(recordIdSchema),
    status: z.enum(["supported", "review_required", "unsupported"]),
    note: z.string().trim().max(2_000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "supported" && value.evidenceIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["evidenceIds"],
        message: "Supported claims require at least one evidence ID.",
      });
    }
  });

export const claimReviewSchema = z
  .object({
    claimId: recordIdSchema,
    decision: z.enum(["verified", "needs_correction", "do_not_use"]),
    note: z.string().trim().max(2_000).optional(),
    reviewedAt: isoDateTimeSchema,
  })
  .strict();

export const applicationPackageSchema = z
  .object({
    id: recordIdSchema,
    opportunityId: recordIdSchema,
    profileVersion: z.number().int().positive(),
    executiveSummary: nonEmptyTextSchema,
    tailoredResume: nonEmptyTextSchema,
    coverLetter: nonEmptyTextSchema,
    atsAnalysis: z
      .object({
        matchedKeywords: z.array(nonEmptyTextSchema.max(200)),
        missingKeywords: z.array(nonEmptyTextSchema.max(200)),
        transferableKeywords: z.array(nonEmptyTextSchema.max(200)),
        alignmentSummary: nonEmptyTextSchema.max(4_000),
      })
      .strict(),
    interviewTalkingPoints: z.array(
      z
        .object({
          topic: nonEmptyTextSchema.max(300),
          talkingPoint: nonEmptyTextSchema.max(4_000),
          evidenceIds: z.array(recordIdSchema).min(1),
        })
        .strict(),
    ),
    claims: z.array(factualClaimSchema),
    missingInformation: z.array(
      z
        .object({
          requirement: nonEmptyTextSchema.max(1_000),
          nearestSupportedExperience: z.string().trim().max(2_000),
          action: z.enum(["omit", "clarify", "verify"]),
        })
        .strict(),
    ),
    generatedAt: isoDateTimeSchema,
    draft: z.literal(true),
  })
  .strict();

export const applicationStatusSchema = z.enum([
  "discovered",
  "shortlisted",
  "drafting",
  "factual_review",
  "document_verification",
  "ready",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
]);

export const readinessCheckSchema = z
  .object({
    id: recordIdSchema,
    label: nonEmptyTextSchema.max(300),
    required: z.boolean(),
    status: z.enum(["pending", "passed", "failed", "skipped"]),
    detail: z.string().trim().max(2_000).optional(),
  })
  .strict();

export type FactualClaim = z.infer<typeof factualClaimSchema>;
export type ClaimReview = z.infer<typeof claimReviewSchema>;
export type ApplicationPackage = z.infer<typeof applicationPackageSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type ReadinessCheck = z.infer<typeof readinessCheckSchema>;
