import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  recordIdSchema,
} from "./common.js";
import { importedFactSchema } from "./evidence.js";

export const evidenceDecisionSchema = z.enum([
  "pending",
  "confirmed",
  "corrected",
  "rejected",
]);

export const canonicalEvidenceRecordSchema = importedFactSchema
  .extend({
    decision: evidenceDecisionSchema,
    correctedValue: z.string().trim().min(1).max(10_000).optional(),
    decisionNote: z.string().trim().max(2_000).optional(),
    decidedAt: isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.decision === "corrected" && !record.correctedValue) {
      context.addIssue({
        code: "custom",
        path: ["correctedValue"],
        message: "Corrected evidence requires a corrected value.",
      });
    }
    if (record.decision !== "corrected" && record.correctedValue) {
      context.addIssue({
        code: "custom",
        path: ["correctedValue"],
        message: "Only corrected evidence may contain a corrected value.",
      });
    }
    if (record.decision !== "pending" && !record.decidedAt) {
      context.addIssue({
        code: "custom",
        path: ["decidedAt"],
        message: "Reviewed evidence requires a decision timestamp.",
      });
    }
  });

export const compatibilityStateSchema = z
  .object({
    generatedFromRevision: z.number().int().nonnegative(),
    profileSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    ledgerSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .strict();

export const canonicalCareerProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    candidateId: recordIdSchema,
    revision: z.number().int().positive(),
    sourceImportedAt: isoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    records: z.array(canonicalEvidenceRecordSchema),
    compatibility: compatibilityStateSchema,
  })
  .strict()
  .superRefine((profile, context) => {
    const ids = new Set<string>();
    for (const [index, record] of profile.records.entries()) {
      if (ids.has(record.id)) {
        context.addIssue({
          code: "custom",
          path: ["records", index, "id"],
          message: `Duplicate evidence record ID: ${record.id}`,
        });
      }
      ids.add(record.id);
    }
    if (profile.compatibility.generatedFromRevision > profile.revision) {
      context.addIssue({
        code: "custom",
        path: ["compatibility", "generatedFromRevision"],
        message: "Compatibility views cannot be newer than the canonical revision.",
      });
    }
  });

export const evidenceDecisionRequestSchema = z
  .object({
    factId: recordIdSchema,
    expectedRevision: z.number().int().nonnegative(),
    decision: z.enum(["confirmed", "corrected", "rejected"]),
    correctedValue: z.string().trim().min(1).max(10_000).optional(),
    note: z.string().trim().max(2_000).optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.decision === "corrected" && !request.correctedValue) {
      context.addIssue({
        code: "custom",
        path: ["correctedValue"],
        message: "Enter the corrected wording before saving.",
      });
    }
    if (request.decision !== "corrected" && request.correctedValue) {
      context.addIssue({
        code: "custom",
        path: ["correctedValue"],
        message: "Corrected wording is only accepted with a corrected decision.",
      });
    }
  });

export const evidenceAdditionRequestSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  category: z.enum(["experience", "skills", "projects", "education", "credentials", "other"]),
  value: nonEmptyTextSchema.max(10_000),
  note: z.string().trim().max(2_000).optional(),
}).strict();

export const canonicalReviewSummarySchema = z
  .object({
    revision: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    confirmed: z.number().int().nonnegative(),
    corrected: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  })
  .strict();

export function effectiveEvidenceValue(
  record: z.infer<typeof canonicalEvidenceRecordSchema>,
): string | null {
  if (record.decision === "rejected" || record.decision === "pending") return null;
  return record.decision === "corrected" ? record.correctedValue ?? null : record.value;
}

export type EvidenceDecision = z.infer<typeof evidenceDecisionSchema>;
export type CanonicalEvidenceRecord = z.infer<typeof canonicalEvidenceRecordSchema>;
export type CanonicalCareerProfile = z.infer<typeof canonicalCareerProfileSchema>;
export type EvidenceDecisionRequest = z.infer<typeof evidenceDecisionRequestSchema>;
export type EvidenceAdditionRequest = z.infer<typeof evidenceAdditionRequestSchema>;
export type CanonicalReviewSummary = z.infer<typeof canonicalReviewSummarySchema>;
