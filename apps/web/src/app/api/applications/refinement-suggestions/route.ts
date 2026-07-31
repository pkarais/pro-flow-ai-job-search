import { z } from "zod";
import { NextResponse } from "next/server";
import type { OpportunityIntake } from "@pro-flow/career-core";
import { generateRefinementSuggestions } from "@/server/ai/grounded-writing-service";
import { ApplicationStore } from "@/server/applications/application-store";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { OperationsStore } from "@/server/operations/operations-store";

export const runtime = "nodejs";
const requestSchema = z.object({ applicationId: z.string().min(1).max(200) }).strict();

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const application = await new ApplicationStore(careerDataRoot()).load(input.applicationId);
    if (!application) return NextResponse.json({ error: "Application archive not found." }, { status: 404 });
    const profile = await loadCanonicalProfile();
    if (!profile) return NextResponse.json({ error: "Canonical career evidence is unavailable." }, { status: 409 });
    const operations = await new OperationsStore(careerDataRoot()).load();
    const matchingJobIds = new Set(operations.jobs.filter((job) => job.url === application.opportunity.url || (job.company.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase() && job.title.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase())).map((job) => job.id));
    const insights = operations.companyInsights
      .filter((insight) => insight.kind === "company_overview" && (matchingJobIds.has(insight.jobId) || (insight.company.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase() && insight.role.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase())))
      .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt))
      .slice(0, 1);
    const intake: OpportunityIntake = { ...application.opportunity };
    const generation = await generateRefinementSuggestions(
      intake,
      profile,
      insights.map(({ id, kind, report }) => ({ id, kind, report })),
      {
        positioningSummary: application.draft.summary,
        claims: application.draft.claims.map(({ text, kind, decision }) => ({ text, kind, decision })),
        coverLetter: application.draft.coverLetter,
      },
    );
    if (generation.method !== "ai") return NextResponse.json({ error: generation.note }, { status: 503 });
    return NextResponse.json({ suggestions: generation.value, model: generation.model });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate emphasis suggestions." }, { status: 400 });
  }
}
