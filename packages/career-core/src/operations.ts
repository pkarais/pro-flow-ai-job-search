import { z } from "zod";
import { applicationStatusSchema } from "./application.js";
import { isoDateTimeSchema, nonEmptyTextSchema, recordIdSchema } from "./common.js";

export const portalIdSchema = z.enum([
  "freehire-search", "linkedin-search", "jobbank-search",
  "jobdanmark-search", "jobindex-search", "jobnet-search",
]);

export const portalRuntimeStatusSchema = z.enum(["ready", "needs_setup", "unavailable"]);

export const portalRuntimeReportSchema = z.object({
  bunVersion: nonEmptyTextSchema.max(100).optional(),
  checkedAt: isoDateTimeSchema,
  portals: z.array(z.object({
    portal: portalIdSchema,
    label: nonEmptyTextSchema.max(100),
    status: portalRuntimeStatusSchema,
    message: nonEmptyTextSchema.max(500),
  }).strict()),
}).strict();

export const jobSearchRequestSchema = z.object({
  portal: portalIdSchema,
  query: nonEmptyTextSchema.max(200),
  location: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(20).default(10),
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
  firstSeenAt: isoDateTimeSchema,
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

export const operationsStateSchema = z.object({
  schemaVersion: z.literal(1),
  revision: z.number().int().nonnegative(),
  jobs: z.array(normalizedJobSchema),
  pipeline: z.array(pipelineRecordSchema),
  interviews: z.array(interviewPackSchema),
  outcomes: z.array(outcomeSchema),
  updatedAt: isoDateTimeSchema,
}).strict();

export type PortalId = z.infer<typeof portalIdSchema>;
export type PortalRuntimeReport = z.infer<typeof portalRuntimeReportSchema>;
export type JobSearchRequest = z.infer<typeof jobSearchRequestSchema>;
export type NormalizedJob = z.infer<typeof normalizedJobSchema>;
export type PipelineRecord = z.infer<typeof pipelineRecordSchema>;
export type PipelineTransitionRequest = z.infer<typeof pipelineTransitionRequestSchema>;
export type InterviewPack = z.infer<typeof interviewPackSchema>;
export type InterviewPackRequest = z.infer<typeof interviewPackRequestSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;
export type OutcomeRequest = z.infer<typeof outcomeRequestSchema>;
export type OperationsState = z.infer<typeof operationsStateSchema>;
