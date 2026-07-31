import { careerDataRoot } from "@/server/canonical/review-service";
import { pollCompanyResearch, startCompanyResearch } from "@/server/ai/company-insights-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { saveCompanyInsight } from "@/server/operations/operations-service";

export const runtime = "nodejs";

function validId(value: unknown) {
  return typeof value === "string" && /^[-_a-zA-Z0-9]+$/.test(value) ? value : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { jobId?: unknown };
    const jobId = validId(body.jobId);
    if (!jobId) return Response.json({ error: "Select a saved job first." }, { status: 400 });
    const state = await new OperationsStore(careerDataRoot()).load();
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return Response.json({ error: "Saved job not found." }, { status: 404 });
    const research = await startCompanyResearch(job);
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
    const responseId = validId(url.searchParams.get("responseId"));
    if (!jobId || !responseId) return Response.json({ error: "The research request is invalid." }, { status: 400 });
    const root = careerDataRoot();
    const state = await new OperationsStore(root).load();
    const job = state.jobs.find((item) => item.id === jobId);
    if (!job) return Response.json({ error: "Saved job not found." }, { status: 404 });
    const result = await pollCompanyResearch(responseId, job);
    if (result.status === "queued" || result.status === "in_progress") {
      return Response.json({ status: result.status }, { status: 202 });
    }
    if (result.status === "failed") return Response.json({ error: result.error }, { status: 503 });
    if (result.status !== "completed") return Response.json({ status: "in_progress" }, { status: 202 });
    const saved = await saveCompanyInsight(root, { jobId, ...result.insight });
    return Response.json({ message: `Company insights for ${job.company} were completed and saved.`, state: saved });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Company research could not be checked." }, { status: 503 });
  }
}
