import { z } from "zod";
import { documentIdentitySchema, documentPaletteSchema, documentThemeIdSchema } from "./documents.js";
import { nonEmptyTextSchema, recordIdSchema } from "./common.js";

const resumeRoleSchema = z.object({
  employer: nonEmptyTextSchema.max(300),
  title: nonEmptyTextSchema.max(200),
  location: z.string().trim().max(200).optional(),
  dates: nonEmptyTextSchema.max(100),
  highlights: z.array(nonEmptyTextSchema.max(1_000)).max(12),
  evidenceIds: z.array(recordIdSchema),
}).strict();

export const structuredResumeSchema = z.object({
  schemaVersion: z.literal(1),
  applicationId: recordIdSchema,
  applicationRevision: z.number().int().positive(),
  themeId: documentThemeIdSchema,
  artDirection: z.object({
    palette: z.enum(["navy", "teal", "plum", "slate", "forest", "burgundy"]),
    density: z.enum(["compact", "balanced", "editorial"]),
    motif: z.enum(["line", "blocks", "rail", "minimal"]),
    icons: z.boolean(),
    iconSet: z.enum(["classic", "professional", "technical", "operations", "executive", "minimal"]),
    iconTreatment: z.enum(["outline", "badge", "solid"]),
    rationale: nonEmptyTextSchema.max(300),
  }).strict(),
  identity: documentIdentitySchema,
  contactLinks: z.array(z.object({
    label: nonEmptyTextSchema.max(80),
    url: z.url().max(2_000),
  }).strict()).max(6),
  targetTitle: nonEmptyTextSchema.max(200),
  targetPositioning: z.object({
    employer: nonEmptyTextSchema.max(300),
    location: z.string().trim().max(200),
  }).strict(),
  summary: nonEmptyTextSchema.max(2_000),
  expertise: z.array(nonEmptyTextSchema.max(200)).max(20),
  competencyGroups: z.array(z.object({
    label: nonEmptyTextSchema.max(100),
    items: z.array(nonEmptyTextSchema.max(200)).min(1).max(12),
  }).strict()).max(8),
  experience: z.array(resumeRoleSchema).min(1).max(12),
  secondaryExpertise: z.array(nonEmptyTextSchema.max(300)).max(40),
  education: z.array(nonEmptyTextSchema.max(500)).max(10),
  projectsAndSystems: z.array(z.object({
    name: nonEmptyTextSchema.max(200),
    description: nonEmptyTextSchema.max(1_000),
    evidenceIds: z.array(recordIdSchema),
  }).strict()).max(10),
  credentials: z.array(nonEmptyTextSchema.max(500)).max(12),
  verifiedMetrics: z.array(z.object({
    label: nonEmptyTextSchema.max(200),
    value: nonEmptyTextSchema.max(100),
    evidenceIds: z.array(recordIdSchema).min(1),
  }).strict()).max(12),
  optionalVisuals: z.object({
    sectionIcons: z.boolean(),
    competencyBlocks: z.boolean(),
    metricCallouts: z.boolean(),
  }).strict(),
  generatedFromEvidenceIds: z.array(recordIdSchema),
}).strict();

export const resumePreviewRequestSchema = z.object({
  applicationId: recordIdSchema,
  identity: documentIdentitySchema,
  themeId: documentThemeIdSchema,
  paletteOverride: documentPaletteSchema.optional(),
}).strict();

export type StructuredResume = z.infer<typeof structuredResumeSchema>;
export type ResumePreviewRequest = z.infer<typeof resumePreviewRequestSchema>;
