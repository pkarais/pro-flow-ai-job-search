import { z } from "zod";
import { readinessCheckSchema } from "./application.js";
import { isoDateTimeSchema, nonEmptyTextSchema, recordIdSchema } from "./common.js";

export const documentThemeIdSchema = z.enum([
  "executive",
  "technical",
  "ats_classic",
  "government",
  "modern",
]);

export const documentPaletteSchema = z.enum(["navy", "teal", "plum", "slate", "forest", "burgundy"]);
export const documentPalettes = [
  { id: "navy", name: "Navy" },
  { id: "teal", name: "Teal" },
  { id: "plum", name: "Plum" },
  { id: "slate", name: "Slate" },
  { id: "forest", name: "Forest" },
  { id: "burgundy", name: "Burgundy" },
] as const;

export const documentThemes = [
  { id: "executive", name: "Executive", description: "Confident hierarchy and restrained styling for directors, operations, and senior leadership.", bestFor: "Leadership, operations, facilities, logistics" },
  { id: "technical", name: "Technical", description: "Compact, structured presentation for engineering, IT, data, and infrastructure work.", bestFor: "Engineering, technology, data, infrastructure" },
  { id: "ats_classic", name: "ATS Classic", description: "Conservative typography and minimal decoration for maximum parsing reliability.", bestFor: "High-volume ATS portals and traditional employers" },
  { id: "government", name: "Public Sector", description: "Formal, evidence-forward styling for state, local, nonprofit, and compliance roles; not a federal résumé format.", bestFor: "Public service, compliance, regulated organizations" },
  { id: "modern", name: "Modern", description: "Clean contemporary hierarchy for product, strategy, transformation, and innovation roles.", bestFor: "Product, strategy, transformation, consulting" },
] as const;

export function recommendDocumentTheme(positionTitle: string): DocumentThemeId {
  const title = positionTitle.toLowerCase();
  if (/\b(federal|usajobs)\b/.test(title)) return "ats_classic";
  if (/\b(public sector|public service|municipal|state government|local government|compliance|regulatory)\b/.test(title)) return "government";
  if (/\b(engineer|engineering|developer|software|data|technology|technical|it|infrastructure|cyber|systems)\b/.test(title)) return "technical";
  if (/\b(product|strategy|transformation|innovation|consultant|consulting|program manager|project manager)\b/.test(title)) return "modern";
  if (/\b(director|executive|chief|head|vice president|vp|operations|logistics|facilities|general manager)\b/.test(title)) return "executive";
  return "ats_classic";
}

export const documentIdentitySchema = z.object({
  fullName: nonEmptyTextSchema.max(200),
  email: z.email().max(320),
  phone: nonEmptyTextSchema.max(80),
}).strict();

export const documentGenerationRequestSchema = z.object({
  applicationId: recordIdSchema,
  identity: documentIdentitySchema,
  themeId: documentThemeIdSchema,
  paletteOverride: documentPaletteSchema.optional(),
}).strict();

export const visualReviewRequestSchema = z.object({
  applicationId: recordIdSchema,
  applicationRevision: z.number().int().positive(),
}).strict();

export const documentArtifactSchema = z.object({
  kind: z.enum(["cv_source", "cv_pdf", "cover_letter_source", "cover_letter_pdf", "ats_text", "designed_resume_html", "designed_resume_pdf", "resume_docx", "designed_cover_letter_html", "designed_cover_letter_pdf", "cover_letter_docx"]),
  relativePath: nonEmptyTextSchema.max(500),
  mediaType: nonEmptyTextSchema.max(120),
}).strict();

export const documentReadinessSchema = z.object({
  schemaVersion: z.literal(2),
  applicationId: recordIdSchema,
  applicationRevision: z.number().int().positive(),
  themeId: documentThemeIdSchema,
  paletteId: documentPaletteSchema.optional(),
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
export type DocumentThemeId = z.infer<typeof documentThemeIdSchema>;
export type DocumentPalette = z.infer<typeof documentPaletteSchema>;
export type DocumentGenerationRequest = z.infer<typeof documentGenerationRequestSchema>;
export type VisualReviewRequest = z.infer<typeof visualReviewRequestSchema>;
