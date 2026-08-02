import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  canTransition,
  effectiveEvidenceValue,
  interviewPackRequestSchema,
  jobImportRequestSchema,
  outcomeRequestSchema,
  portalGroupPortals,
  portalGroupSearchRequestSchema,
  pipelineTransitionRequestSchema,
  type ArchivedApplication,
  type CanonicalCareerProfile,
  type CompanyInsightRecord,
  type InterviewPackRequest,
  type JobImportRequest,
  type OutcomeRequest,
  type PortalGroupSearchRequest,
  type PipelineRecord,
  type PipelineTransitionRequest,
} from "@pro-flow/career-core";
import { ApplicationStore } from "../applications/application-store.ts";
import { DocumentService } from "../documents/document-service.ts";
import { generateInterviewWriting } from "../ai/grounded-writing-service.ts";
import { OperationsStore } from "./operations-store.ts";

export async function listApplications(dataRoot: string): Promise<ArchivedApplication[]> {
  return currentApplications(await listApplicationArchives(dataRoot));
}

export async function listApplicationArchives(dataRoot: string): Promise<ArchivedApplication[]> {
  const directory = path.resolve(dataRoot, "applications");
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const store = new ApplicationStore(dataRoot);
    const loaded = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => store.load(entry.name.slice(0, -5))));
    return loaded
      .filter((item): item is ArchivedApplication => Boolean(item))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function restoreApplication(dataRoot: string, applicationId: string) {
  const application = await new ApplicationStore(dataRoot).load(applicationId);
  if (!application) throw new Error("Application archive not found.");
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  return store.save({
    ...state,
    dismissedApplicationIds: state.dismissedApplicationIds.filter((id) => id !== applicationId),
  }, state.revision);
}

export async function permanentlyDeleteApplication(dataRoot: string, applicationId: string) {
  const applicationStore = new ApplicationStore(dataRoot);
  const application = await applicationStore.load(applicationId);
  if (!application) throw new Error("Application archive not found.");
  const operations = new OperationsStore(dataRoot);
  const state = await operations.load();
  await applicationStore.delete(applicationId);
  return operations.save({
    ...state,
    pipeline: state.pipeline.filter((record) => record.applicationId !== applicationId),
    interviews: state.interviews.filter((record) => record.applicationId !== applicationId),
    outcomes: state.outcomes.filter((record) => record.applicationId !== applicationId),
    dismissedApplicationIds: state.dismissedApplicationIds.filter((id) => id !== applicationId),
  }, state.revision);
}

function normalizedOpportunityPart(value?: string) {
  return (value ?? "").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function currentApplications(applications: ArchivedApplication[]): ArchivedApplication[] {
  const current = new Map<string, ArchivedApplication>();
  for (const application of applications) {
    const opportunity = application.opportunity;
    const key = [
      normalizedOpportunityPart(opportunity.companyName),
      normalizedOpportunityPart(opportunity.positionTitle),
      normalizedOpportunityPart(opportunity.location),
    ].join("|");
    const existing = current.get(key);
    if (!existing || Date.parse(application.updatedAt) > Date.parse(existing.updatedAt)) {
      current.set(key, application);
    }
  }
  return [...current.values()].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
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

export async function saveCompanyInsight(
  dataRoot: string,
  insight: Omit<CompanyInsightRecord, "id">,
) {
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  const record: CompanyInsightRecord = {
    id: `insight_${randomUUID().replaceAll("-", "")}`,
    ...insight,
  };
  return store.save({
    ...state,
    companyInsights: [...state.companyInsights, record].slice(-100),
  }, state.revision);
}

const portalHosts = {
  "linkedin-search": ["linkedin.com", "www.linkedin.com"],
  "indeed-search": ["indeed.com", "www.indeed.com"],
  "usajobs-search": ["usajobs.gov", "www.usajobs.gov"],
  "dice-search": ["dice.com", "www.dice.com"],
  "builtin-search": ["builtin.com", "www.builtin.com"],
  "wellfound-search": ["wellfound.com", "www.wellfound.com"],
} as const;

const meaningfulTerm = /^[a-z][a-z0-9+#.-]{2,}$/;
const stopWords = new Set(["and", "the", "with", "for", "this", "that", "from", "your", "you", "our", "are", "will", "job", "role", "work"]);

function terms(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [])]
    .filter((term) => meaningfulTerm.test(term) && !stopWords.has(term));
}

function assessRisk(description: string, postedAt?: string) {
  const text = description.toLowerCase();
  const signals: Array<{ severity: "low" | "medium" | "high" | "critical"; category: "fraud" | "privacy" | "content" | "communication" | "staleness"; message: string }> = [];
  const rules = [
    { pattern: /\b(pay for|processing fee|registration fee|wire transfer|buy equipment|deposit check)\b/i, severity: "critical", category: "fraud", message: "The posting contains language about candidate payments or financial transfers." },
    { pattern: /\b(ssn|social security|bank account|routing number|passport number|credit card)\b/i, severity: "critical", category: "privacy", message: "The posting requests highly sensitive identity or financial information." },
    { pattern: /\b(guaranteed income|get rich quick|unlimited income|financial freedom)\b/i, severity: "high", category: "fraud", message: "The posting contains unrealistic or promotional income language." },
    { pattern: /\b(talent pool|future opportunities|always hiring|evergreen role|general application)\b/i, severity: "medium", category: "staleness", message: "The posting may describe an evergreen pipeline rather than one immediate opening." },
    { pattern: /\b(apply today|act fast|limited spots|urgent hiring|start immediately)\b/i, severity: "low", category: "communication", message: "The posting uses urgency language; verify the employer and deadline." },
  ] as const;
  for (const rule of rules) if (rule.pattern.test(text)) signals.push({ severity: rule.severity, category: rule.category, message: rule.message });
  if (description.trim().length < 250) signals.push({ severity: "medium", category: "content", message: "The description is unusually short and may omit important responsibilities or qualifications." });
  if (postedAt) {
    const date = new Date(postedAt);
    if (!Number.isNaN(date.valueOf()) && Date.now() - date.valueOf() > 60 * 86_400_000) {
      signals.push({ severity: "medium", category: "staleness", message: "The supplied posting date is more than 60 days old." });
    }
  }
  const weights = { low: 8, medium: 18, high: 30, critical: 45 };
  const score = Math.min(100, signals.reduce((sum, signal) => sum + weights[signal.severity], 0));
  return { score, level: score >= 60 ? "high" as const : score >= 25 ? "medium" as const : "low" as const, signals };
}

function scoreJob(request: JobImportRequest, profile: CanonicalCareerProfile | null) {
  const evidence = profile?.records.flatMap((record) => {
    const value = effectiveEvidenceValue(record);
    return value ? [value] : [];
  }) ?? [];
  const evidenceTerms = new Set(terms(evidence.join(" ")));
  const postingTerms = terms(`${request.title} ${request.description ?? ""}`);
  const matchedTerms = postingTerms.filter((term) => evidenceTerms.has(term)).slice(0, 25);
  const gaps = postingTerms.filter((term) => !evidenceTerms.has(term)).slice(0, 12);
  const titleTerms = terms(request.title);
  const titleMatches = titleTerms.filter((term) => evidenceTerms.has(term)).length;
  const skillScore = Math.min(55, matchedTerms.length * 3);
  const titleScore = titleTerms.length ? Math.round(25 * titleMatches / titleTerms.length) : 0;
  const locationText = request.location?.toLowerCase() ?? "";
  const locationScore = /\b(new york|new jersey|pennsylvania|ny|nj|pa|east coast|remote)\b/.test(locationText) ? 15 : 5;
  const descriptionScore = request.description && request.description.length >= 250 ? 5 : 0;
  const score = Math.min(100, skillScore + titleScore + locationScore + descriptionScore);
  const dealBreakers = profile?.records
    .filter((record) => /deal.?breaker/i.test(record.path))
    .flatMap((record) => {
      const value = effectiveEvidenceValue(record);
      return value && `${request.title} ${request.company} ${request.description ?? ""}`.toLowerCase().includes(value.toLowerCase()) ? [value] : [];
    }) ?? [];
  return {
    score: dealBreakers.length ? Math.min(score, 20) : score,
    matchedTerms,
    gaps,
    dealBreakers,
    scoringExplanation: [
      `${matchedTerms.length} posting terms match confirmed career evidence.`,
      `${titleMatches} of ${titleTerms.length} meaningful title terms match confirmed evidence.`,
      locationScore === 15 ? "The location matches the authorized East Coast or remote preference." : "The location needs preference review.",
      ...(dealBreakers.length ? ["One or more reviewed dealbreakers matched; the score was capped."] : []),
    ],
  };
}

export async function importJob(dataRoot: string, input: JobImportRequest, profile: CanonicalCareerProfile | null = null) {
  const request = jobImportRequestSchema.parse(input);
  const url = new URL(request.url);
  const allowedHosts: readonly string[] = portalHosts[request.portal];
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
    throw new Error("The posting URL must match the selected approved job portal.");
  }
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  const existing = state.jobs.find((job) => job.url === url.toString());
  if (existing) {
    const currentDescription = existing.description?.trim() ?? "";
    const capturedDescription = request.description?.trim() ?? "";
    const hasRicherDescription = capturedDescription.length > currentDescription.length + 100;
    const hasMissingLocation = !existing.location && Boolean(request.location);
    const hasMissingPostedAt = !existing.postedAt && Boolean(request.postedAt);
    if (!hasRicherDescription && !hasMissingLocation && !hasMissingPostedAt) return state;
    const description = hasRicherDescription ? capturedDescription : currentDescription;
    const refreshed = {
      ...existing,
      location: existing.location || request.location || undefined,
      description: description || undefined,
      postedAt: existing.postedAt || request.postedAt || undefined,
      ...scoreJob({ ...request, description }, profile),
      riskReview: assessRisk(description, existing.postedAt || request.postedAt),
    };
    return store.save({
      ...state,
      jobs: state.jobs.map((job) => job.id === existing.id ? refreshed : job),
    }, state.revision);
  }
  const duplicate = state.jobs.find((job) =>
    job.title.toLowerCase() === request.title.toLowerCase()
    && job.company.toLowerCase() === request.company.toLowerCase()
  );
  const scoring = scoreJob(request, profile);
  return store.save({
    ...state,
    jobs: [...state.jobs, {
      id: `job_${randomUUID().replaceAll("-", "")}`,
      portal: request.portal,
      externalId: url.toString(),
      title: request.title,
      company: request.company,
      location: request.location || undefined,
      url: url.toString(),
      description: request.description || undefined,
      postedAt: request.postedAt || undefined,
      ...scoring,
      duplicateOf: duplicate?.id,
      riskReview: assessRisk(request.description ?? "", request.postedAt),
      firstSeenAt: new Date().toISOString(),
    }],
  }, state.revision);
}

export async function rescoreJobs(dataRoot: string, profile: CanonicalCareerProfile | null) {
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  return store.save({
    ...state,
    jobs: state.jobs.map((job) => ({
      ...job,
      ...scoreJob({
        portal: job.portal,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description,
        postedAt: job.postedAt,
      }, profile),
      riskReview: assessRisk(job.description ?? "", job.postedAt),
    })),
  }, state.revision);
}

export async function deleteJob(dataRoot: string, jobId: string) {
  if (!/^[-_a-zA-Z0-9]+$/.test(jobId)) throw new Error("The job ID is invalid.");
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  const deleted = state.jobs.find((job) => job.id === jobId);
  if (!deleted) throw new Error("Saved job not found.");
  const applications = await listApplications(dataRoot);
  const relatedApplicationIds = applications
    .filter((application) =>
      application.opportunity.url === deleted.url
      || (
        !application.opportunity.url
        && application.opportunity.companyName.trim().toLowerCase() === deleted.company.trim().toLowerCase()
        && application.opportunity.positionTitle.trim().toLowerCase() === deleted.title.trim().toLowerCase()
      ))
    .map((application) => application.id);
  const related = new Set(relatedApplicationIds);
  return store.save({
    ...state,
    jobs: state.jobs
      .filter((job) => job.id !== jobId)
      .map((job) => job.duplicateOf === jobId ? { ...job, duplicateOf: undefined } : job),
    pipeline: state.pipeline.filter((record) => !related.has(record.applicationId)),
    interviews: state.interviews.filter((record) => !related.has(record.applicationId)),
    outcomes: state.outcomes.filter((record) => !related.has(record.applicationId)),
    companyInsights: state.companyInsights.filter((record) => record.jobId !== jobId),
    dismissedApplicationIds: [...new Set([...state.dismissedApplicationIds, ...relatedApplicationIds])],
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
  const store = new OperationsStore(dataRoot);
  const state = await store.load();
  const application = await new ApplicationStore(dataRoot).load(request.applicationId);
  if (!application) throw new Error("Application archive not found.");
  const claims = application.draft.claims.filter((claim) => claim.decision === "verified").map((claim) => claim.text);
  if (!claims.length) throw new Error("Interview preparation requires verified submitted claims.");
  const normalizedCompany = application.opportunity.companyName.trim().toLowerCase();
  const normalizedRole = application.opportunity.positionTitle.trim().toLowerCase();
  const matchingJobIds = new Set(state.jobs.filter((job) => job.url === application.opportunity.url
    || (job.company.trim().toLowerCase() === normalizedCompany && job.title.trim().toLowerCase() === normalizedRole)).map((job) => job.id));
  const relevantInsights = state.companyInsights
    .filter((insight) => matchingJobIds.has(insight.jobId)
      || (insight.company.trim().toLowerCase() === normalizedCompany && insight.role.trim().toLowerCase() === normalizedRole))
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))
    .filter((insight, index, all) => all.findIndex((candidate) => candidate.kind === insight.kind) === index)
    .map((insight) => ({ kind: insight.kind, report: insight.report }));
  const generated = await generateInterviewWriting(application, request.stage, relevantInsights);
  const insightQuestions = [...new Set(relevantInsights.flatMap((insight) => insight.report
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*#\d.)]+\s*/, "").replace(/\[([^\]]+)]\([^)]+\)/g, "$1").trim())
    .filter((line) => line.endsWith("?") && line.length >= 15 && line.length <= 1_000)))].slice(0, 4);
  const fallback = {
    likelyQuestions: [
      `Why are you interested in ${application.opportunity.positionTitle} at ${application.opportunity.companyName}?`,
      ...application.draft.gaps.slice(0, 4).map((gap) => `How would you address the gap around ${gap}?`),
      `Which verified experience best demonstrates readiness for this ${request.stage.replaceAll("_", " ")}?`,
    ],
    bridgeAnswers: application.draft.gaps.slice(0, 4).map((gap) => `Acknowledge ${gap}, connect the closest verified experience, and explain a concrete learning path without claiming prior experience.`),
    questionsToAsk: [
      ...insightQuestions,
      "What would success look like in the first six months?",
      "What is the biggest challenge the team is facing right now?",
      "How does the team evaluate and support professional growth?",
      "What do people who thrive on this team have in common?",
    ].slice(0, 8),
  };
  const content = generated.method === "ai"
    ? {
        likelyQuestions: generated.value.likelyQuestions,
        bridgeAnswers: generated.value.bridgeAnswers.map((answer) => answer.text),
        questionsToAsk: generated.value.questionsToAsk,
      }
    : fallback;
  const pack = {
    applicationId: application.id,
    stage: request.stage,
    scheduledAt: request.scheduledAt || undefined,
    ...content,
    consistencyClaims: claims,
    generation: generated.method === "ai"
      ? { method: "ai" as const, model: generated.model }
      : { method: "template" as const, note: generated.note },
    generatedAt: new Date().toISOString(),
  };
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
