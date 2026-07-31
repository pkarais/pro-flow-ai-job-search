import { z } from "zod";

export const recordIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "Use letters, numbers, underscores, or hyphens.");

export const nonEmptyTextSchema = z.string().trim().min(1);

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const verificationStatusSchema = z.enum([
  "verified",
  "needs_review",
  "conflicting",
  "rejected",
]);

export const evidenceReferenceSchema = z
  .object({
    sourceId: recordIdSchema,
    sourcePath: nonEmptyTextSchema.max(500),
    excerpt: z.string().trim().max(2_000).optional(),
    importedAt: isoDateTimeSchema,
  })
  .strict();

export const provenanceSchema = z
  .object({
    status: verificationStatusSchema,
    evidence: z.array(evidenceReferenceSchema),
    reviewNote: z.string().trim().max(2_000).optional(),
    verifiedAt: isoDateTimeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "verified" && value.evidence.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "Verified facts require at least one evidence reference.",
      });
    }
  });

export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
export type Provenance = z.infer<typeof provenanceSchema>;
