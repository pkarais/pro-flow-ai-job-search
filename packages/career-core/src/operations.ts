import { z } from "zod";
import { applicationStatusSchema } from "./application.js";
import { generationMetadataSchema } from "./application-workflow.js";
import { isoDateTimeSchema, nonEmptyTextSchema, recordIdSchema } from "./common.js";

export const portalIdSchema = z.enum([
  "linkedin-search", "indeed-search", "usajobs-search",
  "dice-search", "builtin-search", "wellfound-search",
]);

export const portalGroupIdSchema = z.enum([
  "linkedin_indeed", "usajobs_builtin", "wellfound_dice", "all",
]);

export const portalGroupPortals = {
  linkedin_indeed: ["linkedin-search", "indeed-search"],
  usajobs_builtin: ["usajobs-search", "builtin-search"],
  wellfound_dice: ["wellfound-search", "dice-search"],
  all: [
    "linkedin-search", "indeed-search", "usajobs-search",
    "builtin-search", "wellfound-search", "dice-search",
  ],
} as const satisfies Record<z.infer<typeof portalGroupIdSchema>, readonly z.infer<typeof portalIdSchema>[]>;

export const portalRuntimeStatusSchema = z.enum(["ready", "needs_setup", "unavailable"]);

export const portalRuntimeReportSchema = z.object({
  checkedAt: isoDateTimeSchema,
  portals: z.array(z.object({
    portal: portalIdSchema,
    label: nonEmptyTextSchema.max(100),
    status: portalRuntimeStatusSchema,
    searchMode: z.enum(["official_search", "official_api"]),
    message: nonEmptyTextSchema.max(500),
  }).strict()),
}).strict();

export const jobSearchRequestSchema = z.object({
  portal: portalIdSchema,
  query: nonEmptyTextSchema.max(200),
  location: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(20).default(10),
}).strict();

export const portalGroupSearchRequestSchema = z.object({
  group: portalGroupIdSchema,
  query: nonEmptyTextSchema.max(200),
  location: nonEmptyTextSchema.max(200).default("United States"),
}).strict();

export const searchRunSchema = z.object({
  id: recordIdSchema,
  group: portalGroupIdSchema,
  query: nonEmptyTextSchema.max(200),
  location: nonEmptyTextSchema.max(200),
  portals: z.array(portalIdSchema).min(2).max(6),
  launchedAt: isoDateTimeSchema,
}).strict();

export const searchDefaultsSchema = z.object({
  roles: z.array(nonEmptyTextSchema.max(200)).max(40),
  locations: z.array(nonEmptyTextSchema.max(200)).max(20),
  source: z.enum(["reviewed_profile", "import_preview", "fallback"]),
}).strict();

export const normalizedJobSchema = z.object({
  id: recordIdSchema,
  portal: portalIdSchema,
  externalId: nonEmptyTextSchema.max(500),
  title: nonEmptyTextSchema.max(300),
  company: nonEmptyTextSchema.max(300),
  location: z.string().trim().max(500).optional(),
  url: z.url().max(2_000),
  description: z.string().trim().max(50_000).optional(),
  postedAt: z.string().trim().max(100).optional(),
  score: z.number().int().min(0).max(100),
  matchedTerms: z.array(nonEmptyTextSchema.max(100)),
  gaps: z.array(nonEmptyTextSchema.max(100)),
  dealBreakers: z.array(nonEmptyTextSchema.max(500)).default([]),
  duplicateOf: recordIdSchema.optional(),
  riskReview: z.object({
    score: z.number().int().min(0).max(100),
    level: z.enum(["low", "medium", "high"]),
    signals: z.array(z.object({
      severity: z.enum(["low", "medium", "high", "critical"]),
      category: z.enum(["fraud", "privacy", "content", "communication", "staleness"]),
      message: nonEmptyTextSchema.max(500),
    }).strict()),
  }).strict().optional(),
  scoringExplanation: z.array(nonEmptyTextSchema.max(500)).default([]),
  firstSeenAt: isoDateTimeSchema,
}).strict();

export const jobImportRequestSchema = z.object({
  portal: portalIdSchema,
  title: nonEmptyTextSchema.max(300),
  company: nonEmptyTextSchema.max(300),
  location: z.string().trim().max(500).optional(),
  url: z.url().max(2_000),
  description: z.string().trim().max(50_000).optional(),
  postedAt: z.string().trim().max(100).optional(),
}).strict();

export const pipelineEventSchema = z.object({
  id: recordIdSchema,
  from: applicationStatusSchema,
  to: applicationStatusSchema,
  note: z.string().trim().max(2_000).optional(),
  occurredAt: isoDateTimeSchema,
}).strict();

export const pipelineRecordSchema = z.object({
  applicationId: recordIdSchema,
  revision: z.number().int().positive(),
  status: applicationStatusSchema,
  events: z.array(pipelineEventSchema),
  updatedAt: isoDateTimeSchema,
}).strict();

export const pipelineTransitionRequestSchema = z.object({
  applicationId: recordIdSchema,
  expectedRevision: z.number().int().nonnegative(),
  to: applicationStatusSchema,
  note: z.string().trim().max(2_000).optional(),
}).strict();

export const interviewPackSchema = z.object({
  applicationId: recordIdSchema,
  stage: z.enum(["phone_screen", "technical", "case", "final_round"]),
  scheduledAt: isoDateTimeSchema.optional(),
  likelyQuestions: z.array(nonEmptyTextSchema.max(1_000)),
  consistencyClaims: z.array(nonEmptyTextSchema.max(4_000)),
  bridgeAnswers: z.array(nonEmptyTextSchema.max(2_000)),
  questionsToAsk: z.array(nonEmptyTextSchema.max(1_000)),
  generation: generationMetadataSchema.optional(),
  generatedAt: isoDateTimeSchema,
}).strict();

export const interviewPackRequestSchema = z.object({
  applicationId: recordIdSchema,
  stage: interviewPackSchema.shape.stage,
  scheduledAt: z.union([z.literal(""), isoDateTimeSchema]).optional(),
}).strict();

export const outcomeSchema = z.object({
  id: recordIdSchema,
  applicationId: recordIdSchema,
  status: z.enum(["in_progress", "hired", "offer_declined", "rejected", "no_response", "interview_only"]),
  note: nonEmptyTextSchema.max(4_000),
  recordedAt: isoDateTimeSchema,
}).strict();

export const outcomeRequestSchema = z.object({
  applicationId: recordIdSchema,
  status: outcomeSchema.shape.status,
  note: nonEmptyTextSchema.max(4_000),
}).strict();

export const companyInsightCitationSchema = z.object({
  startIndex: z.number().int().nonnegative(),
  endIndex: z.number().int().nonnegative(),
  title: nonEmptyTextSchema.max(500),
  url: z.url().max(2_000),
}).strict();

export const companyInsightRecordSchema = z.object({
  id: recordIdSchema,
  jobId: recordIdSchema,
  kind: z.enum(["company_overview", "direct_application"]).default("company_overview"),
  company: nonEmptyTextSchema.max(300),
  role: nonEmptyTextSchema.max(300),
  report: nonEmptyTextSchema.max(30_000),
  citations: z.array(companyInsightCitationSchema).min(1).max(100),
  generatedAt: isoDateTimeSchema,
  model: nonEmptyTextSchema.max(200),
}).strict();

export const operationsStateSchema = z.object({
  schemaVersion: z.literal(5),
  revision: z.number().int().nonnegative(),
  jobs: z.array(normalizedJobSchema),
  searches: z.array(searchRunSchema).max(50),
  pipeline: z.array(pipelineRecordSchema),
  interviews: z.array(interviewPackSchema),
  outcomes: z.array(outcomeSchema),
  companyInsights: z.array(companyInsightRecordSchema),
  dismissedApplicationIds: z.array(recordIdSchema),
  updatedAt: isoDateTimeSchema,
}).strict();

export type PortalId = z.infer<typeof portalIdSchema>;
export type PortalGroupId = z.infer<typeof portalGroupIdSchema>;
export type PortalGroupSearchRequest = z.infer<typeof portalGroupSearchRequestSchema>;
export type PortalRuntimeReport = z.infer<typeof portalRuntimeReportSchema>;
export type JobSearchRequest = z.infer<typeof jobSearchRequestSchema>;
export type SearchDefaults = z.infer<typeof searchDefaultsSchema>;
export type SearchRun = z.infer<typeof searchRunSchema>;
export type NormalizedJob = z.infer<typeof normalizedJobSchema>;
export type JobImportRequest = z.infer<typeof jobImportRequestSchema>;
export type PipelineRecord = z.infer<typeof pipelineRecordSchema>;
export type PipelineTransitionRequest = z.infer<typeof pipelineTransitionRequestSchema>;
export type InterviewPack = z.infer<typeof interviewPackSchema>;
export type InterviewPackRequest = z.infer<typeof interviewPackRequestSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;
export type OutcomeRequest = z.infer<typeof outcomeRequestSchema>;
export type CompanyInsightRecord = z.infer<typeof companyInsightRecordSchema>;
export type OperationsState = z.infer<typeof operationsStateSchema>;
