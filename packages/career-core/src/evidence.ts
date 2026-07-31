import { z } from "zod";
import {
  isoDateTimeSchema,
  nonEmptyTextSchema,
  recordIdSchema,
} from "./common.js";

export const evidenceSourceKindSchema = z.enum(["knowledge", "project"]);
export const evidenceSourceStatusSchema = z.enum(["loaded", "missing", "empty", "unreadable"]);
export const importIssueSeveritySchema = z.enum(["info", "warning", "blocking"]);

export const evidenceSourceDefinitionSchema = z
  .object({
    id: recordIdSchema,
    relativePath: nonEmptyTextSchema.max(500),
    label: nonEmptyTextSchema.max(200),
    kind: evidenceSourceKindSchema,
    targetPath: nonEmptyTextSchema.max(300),
  })
  .strict();

export const evidenceSourceSummarySchema = z
  .object({
    id: recordIdSchema,
    relativePath: nonEmptyTextSchema.max(500),
    label: nonEmptyTextSchema.max(200),
    kind: evidenceSourceKindSchema,
    targetPath: nonEmptyTextSchema.max(300),
    status: evidenceSourceStatusSchema,
    factCount: z.number().int().nonnegative(),
  })
  .strict();

export const importedFactSchema = z
  .object({
    id: recordIdSchema,
    path: nonEmptyTextSchema.max(500),
    value: nonEmptyTextSchema.max(10_000),
    sourceId: recordIdSchema,
    sourcePath: nonEmptyTextSchema.max(500),
    sourceSection: z.string().trim().max(500).optional(),
    status: z.enum(["needs_review", "conflicting"]),
    conflictNote: z.string().trim().max(2_000).optional(),
  })
  .strict();

export const importIssueSchema = z
  .object({
    id: recordIdSchema,
    severity: importIssueSeveritySchema,
    sourceId: recordIdSchema.optional(),
    message: nonEmptyTextSchema.max(2_000),
  })
  .strict();

export const evidenceImportResultSchema = z
  .object({
    importedAt: isoDateTimeSchema,
    sourceCount: z.number().int().nonnegative(),
    loadedSourceCount: z.number().int().nonnegative(),
    sources: z.array(evidenceSourceSummarySchema),
    facts: z.array(importedFactSchema),
    issues: z.array(importIssueSchema),
    readOnly: z.literal(true),
  })
  .strict();

export type EvidenceSourceDefinition = z.infer<typeof evidenceSourceDefinitionSchema>;
export type EvidenceSourceSummary = z.infer<typeof evidenceSourceSummarySchema>;
export type ImportedFact = z.infer<typeof importedFactSchema>;
export type ImportIssue = z.infer<typeof importIssueSchema>;
export type EvidenceImportResult = z.infer<typeof evidenceImportResultSchema>;
