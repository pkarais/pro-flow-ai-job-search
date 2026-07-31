import { careerDataRoot } from "@/server/canonical/review-service";
import { pollCompanyResearch, startCompanyResearch } from "@/server/ai/company-insights-service";
import type { CompanyResearchKind } from "@/server/ai/company-insights-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { saveCompanyInsight } from "@/server/operations/operations-service";
import { findResearchRequest, forgetResearchRequest, rememberResearchRequest } from "@/server/ai/research-request-store";

export const runtime = "nodejs";

function validId(value: unknown) {
  return typeof value === "string" && value !== "undefined" && value !== "null" && /^[-_a-zA-Z0-9]+$/.test(value) ? value : null;
}

function validResponseId(value: unknown) {
  return typeof value === "string" && value.startsWith("resp") && value.length <= 500 && !/\s/.test(value) ? value : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { jobId?: unknown; kind?: unknown };
    const jobId = validId(body.jobId);
    const kind: CompanyResearchKind = body.kind === "direct_application" ? "direct_application" : "company_overview";
    if (!jobId) return Response.json({ error: "Select a saved job first." }, { status: 400 });
    const state = await new OperationsStore(careerDataRoot()).load();
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return Response.json({ error: "Saved job not found." }, { status: 404 });
    const research = await startCompanyResearch(job, kind);
    await rememberResearchRequest({ jobId, kind, responseId: research.responseId, startedAt: new Date().toISOString() });
    return Response.json({
      message: `Company research for ${job.company} started.`,
      jobId,
      ...research,
    }, { status: 202 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Company research could not be started." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const jobId = validId(url.searchParams.get("jobId"));
    const kind: CompanyResearchKind = url.searchParams.get("kind") === "direct_application" ? "direct_application" : "company_overview";
    if (!jobId) return Response.json({ error: "The company-research job ID is missing or invalid. Start the research again from the saved job card." }, { status: 400 });
    const suppliedResponseId = validResponseId(url.searchParams.get("responseId"));
    const pending = suppliedResponseId ? null : await findResearchRequest(jobId, kind);
    const responseId = suppliedResponseId ?? pending?.responseId ?? null;
    if (!responseId) return Response.json({ error: "No active AI research request was found. Start a new research request from the saved job card." }, { status: 400 });
    const root = careerDataRoot();
    const state = await new OperationsStore(root).load();
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return Response.json({ error: "Saved job not found." }, { status: 404 });
    const result = await pollCompanyResearch(responseId, job, kind);
    if (result.status === "queued" || result.status === "in_progress") {
      return Response.json({ status: result.status }, { status: 202 });
    }
    if (result.status === "failed") {
      await forgetResearchRequest(jobId, kind);
      return Response.json({ error: result.error }, { status: 503 });
    }
    if (result.status !== "completed") return Response.json({ status: "in_progress" }, { status: 202 });
    const saved = await saveCompanyInsight(root, { jobId, ...result.insight });
    await forgetResearchRequest(jobId, kind);
    return Response.json({ message: `Company insights for ${job.company} were completed and saved.`, state: saved });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Company research could not be checked." }, { status: 503 });
  }
}
