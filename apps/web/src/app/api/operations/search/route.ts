import { jobSearchRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { PortalUnavailableError, searchPortal } from "@/server/operations/portal-adapter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = jobSearchRequestSchema.parse(await request.json());
    const profile = await loadCanonicalProfile();
    if (!profile) return NextResponse.json({ error: "Review career evidence before searching." }, { status: 409 });
    const jobs = await searchPortal(input, profile);
    const store = new OperationsStore(careerDataRoot());
    const state = await store.load();
    const keys = new Set(state.jobs.flatMap((job) => [job.url.toLowerCase(), `${job.company}:${job.title}`.toLowerCase()]));
    const unique = jobs.filter((job) => !keys.has(job.url.toLowerCase()) && !keys.has(`${job.company}:${job.title}`.toLowerCase()));
    const next = await store.save({ ...state, jobs: [...state.jobs, ...unique].sort((a, b) => b.score - a.score) }, state.revision);
    return NextResponse.json({ state: next, added: unique.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed.", isolated: error instanceof PortalUnavailableError },
      { status: error instanceof PortalUnavailableError ? 503 : 400 },
    );
  }
}
