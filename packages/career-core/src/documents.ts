import { z } from "zod";
import { readinessCheckSchema } from "./application.js";
import { isoDateTimeSchema, nonEmptyTextSchema, recordIdSchema } from "./common.js";

export const documentIdentitySchema = z.object({
  fullName: nonEmptyTextSchema.max(200),
  email: z.email().max(320),
  phone: nonEmptyTextSchema.max(80),
}).strict();

export const documentGenerationRequestSchema = z.object({
  applicationId: recordIdSchema,
  identity: documentIdentitySchema,
}).strict();

export const visualReviewRequestSchema = z.object({
  applicationId: recordIdSchema,
  applicationRevision: z.number().int().positive(),
}).strict();

export const documentArtifactSchema = z.object({
  kind: z.enum(["cv_source", "cv_pdf", "cover_letter_source", "cover_letter_pdf", "ats_text"]),
  relativePath: nonEmptyTextSchema.max(500),
  mediaType: nonEmptyTextSchema.max(120),
}).strict();

export const documentReadinessSchema = z.object({
  schemaVersion: z.literal(1),
  applicationId: recordIdSchema,
  applicationRevision: z.number().int().positive(),
  status: z.enum(["blocked", "ready"]),
  artifacts: z.array(documentArtifactSchema),
  checks: z.array(readinessCheckSchema),
  generatedAt: isoDateTimeSchema,
}).strict().superRefine((value, context) => {
  if (value.status === "ready" && value.checks.some((check) => check.required && check.status !== "passed")) {
    context.addIssue({ code: "custom", path: ["status"], message: "Ready requires every mandatory check to pass." });
  }
});

export type DocumentArtifactRecord = z.infer<typeof documentArtifactSchema>;
export type DocumentReadiness = z.infer<typeof documentReadinessSchema>;
export type DocumentIdentity = z.infer<typeof documentIdentitySchema>;
export type DocumentGenerationRequest = z.infer<typeof documentGenerationRequestSchema>;
export type VisualReviewRequest = z.infer<typeof visualReviewRequestSchema>;
