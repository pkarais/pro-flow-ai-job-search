import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  canTransition,
  interviewPackRequestSchema,
  outcomeRequestSchema,
  portalGroupPortals,
  portalGroupSearchRequestSchema,
  pipelineTransitionRequestSchema,
  type ArchivedApplication,
  type InterviewPackRequest,
  type OutcomeRequest,
  type PortalGroupSearchRequest,
  type PipelineRecord,
  type PipelineTransitionRequest,
} from "@pro-flow/career-core";
import { ApplicationStore } from "../applications/application-store.ts";
import { DocumentService } from "../documents/document-service.ts";
import { OperationsStore } from "./operations-store.ts";

export async function listApplications(dataRoot: string): Promise<ArchivedApplication[]> {
  const directory = path.resolve(dataRoot, "applications");
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const store = new ApplicationStore(dataRoot);
    const loaded = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => store.load(entry.name.slice(0, -5))));
    return loaded.filter((item): item is ArchivedApplication => Boolean(item));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function recordSearchRun(
  dataRoot: string,
  input: PortalGroupSearchRequest,
  now = new Date(),
) {
  const request = portalGroupSearchRequestSchema.parse(input);
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  return store.save({
    ...state,
    searches: [...state.searches, {
      id: `search_${randomUUID().replaceAll("-", "")}`,
      group: request.group,
      query: request.query,
      location: request.location,
      portals: [...portalGroupPortals[request.group]],
      launchedAt: now.toISOString(),
    }].slice(-50),
  }, state.revision);
}

export async function transitionPipeline(dataRoot: string, input: PipelineTransitionRequest) {
  const request = pipelineTransitionRequestSchema.parse(input);
  const operations = new OperationsStore(dataRoot);
  const state = await operations.load();
  const existing = state.pipeline.find((record) => record.applicationId === request.applicationId);
  const application = await new ApplicationStore(dataRoot).load(request.applicationId);
  if (!application) throw new Error("Application archive not found.");
  const current: PipelineRecord = existing ?? {
    applicationId: request.applicationId,
    revision: 0,
    status: application.status === "review_complete" ? "document_verification" : "factual_review",
    events: [],
    updatedAt: application.updatedAt,
  };
  if (current.revision !== request.expectedRevision) throw new Error(`Pipeline changed at revision ${current.revision}.`);
  if (!canTransition(current.status, request.to)) throw new Error(`Unsafe transition from ${current.status} to ${request.to}.`);
  if (request.to === "ready" || request.to === "applied") {
    const readiness = await new DocumentService(dataRoot).load(request.applicationId);
    if (!readiness || readiness.status !== "ready" || readiness.applicationRevision !== application.revision) {
      throw new Error("Current documents must pass the complete readiness gate first.");
    }
  }
  const timestamp = new Date().toISOString();
  const nextRecord: PipelineRecord = {
    ...current,
    revision: current.revision + 1,
    status: request.to,
    events: [...current.events, {
      id: `event_${randomUUID().replaceAll("-", "")}`,
      from: current.status,
      to: request.to,
      note: request.note,
      occurredAt: timestamp,
    }],
    updatedAt: timestamp,
  };
  return operations.save({
    ...state,
    pipeline: [...state.pipeline.filter((record) => record.applicationId !== request.applicationId), nextRecord],
  }, state.revision);
}

export async function createInterviewPack(dataRoot: string, input: InterviewPackRequest) {
  const request = interviewPackRequestSchema.parse(input);
  const application = await new ApplicationStore(dataRoot).load(request.applicationId);
  if (!application) throw new Error("Application archive not found.");
  const claims = application.draft.claims.filter((claim) => claim.decision === "verified").map((claim) => claim.text);
  if (!claims.length) throw new Error("Interview preparation requires verified submitted claims.");
  const pack = {
    applicationId: application.id,
    stage: request.stage,
    scheduledAt: request.scheduledAt || undefined,
    likelyQuestions: [
      `Why are you interested in ${application.opportunity.positionTitle} at ${application.opportunity.companyName}?`,
      ...application.draft.gaps.slice(0, 4).map((gap) => `How would you address the gap around ${gap}?`),
      `Which verified experience best demonstrates readiness for this ${request.stage.replaceAll("_", " ")}?`,
    ],
    consistencyClaims: claims,
    bridgeAnswers: application.draft.gaps.slice(0, 4).map((gap) => `Acknowledge ${gap}, connect the closest verified experience, and explain a concrete learning path without claiming prior experience.`),
    questionsToAsk: [
      "What would success look like in the first six months?",
      "What is the biggest challenge the team is facing right now?",
      "How does the team evaluate and support professional growth?",
      "What do people who thrive on this team have in common?",
    ],
    generatedAt: new Date().toISOString(),
  };
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  return store.save({
    ...state,
    interviews: [...state.interviews.filter((item) => !(item.applicationId === application.id && item.stage === request.stage)), pack],
  }, state.revision);
}

export async function recordOutcome(dataRoot: string, input: OutcomeRequest) {
  const request = outcomeRequestSchema.parse(input);
  const application = await new ApplicationStore(dataRoot).load(request.applicationId);
  if (!application) throw new Error("Application archive not found.");
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  const outcome = {
    id: `outcome_${randomUUID().replaceAll("-", "")}`,
    applicationId: request.applicationId,
    status: request.status,
    note: request.note,
    recordedAt: new Date().toISOString(),
  };
  return store.save({ ...state, outcomes: [...state.outcomes, outcome] }, state.revision);
}
