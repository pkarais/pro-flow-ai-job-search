import { careerDataRoot } from "@/server/canonical/review-service";
import { researchCompany } from "@/server/ai/company-insights-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { saveCompanyInsight } from "@/server/operations/operations-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { jobId?: unknown };
    if (typeof body.jobId !== "string" || !/^[-_a-zA-Z0-9]+$/.test(body.jobId)) {
      return Response.json({ error: "Select a saved job first." }, { status: 400 });
    }
    const store = new OperationsStore(careerDataRoot());
    const state = await store.load();
    const job = state.jobs.find((item) => item.id === body.jobId);
    if (!job) return Response.json({ error: "Saved job not found." }, { status: 404 });
    const researched = await researchCompany(job);
    const saved = await saveCompanyInsight(careerDataRoot(), {
      jobId: job.id,
      ...researched,
    });
    return Response.json({ message: `Company insights for ${job.company} were completed and saved.`, state: saved });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Company research could not be generated.",
    }, { status: 503 });
  }
}
