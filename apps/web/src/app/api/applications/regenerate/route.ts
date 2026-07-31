import { regenerateDraftRequestSchema, type OpportunityIntake } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { applyAiWriting } from "@/server/applications/application-service";
import { ApplicationStore } from "@/server/applications/application-store";
import { generateApplicationWriting } from "@/server/ai/grounded-writing-service";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { OperationsStore } from "@/server/operations/operations-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = regenerateDraftRequestSchema.parse(await request.json());
    const store = new ApplicationStore(careerDataRoot());
    const current = await store.load(input.applicationId);
    if (!current) return NextResponse.json({ error: "Application archive not found." }, { status: 404 });
    if (current.revision !== input.expectedRevision) {
      return NextResponse.json({ error: `Revision conflict. Current revision is ${current.revision}.` }, { status: 409 });
    }
    const rejected = current.draft.claims.filter((claim) => claim.decision === "do_not_use");
    const profile = await loadCanonicalProfile();
    if (!profile) return NextResponse.json({ error: "Canonical career evidence is unavailable." }, { status: 409 });
    const intake: OpportunityIntake = {
      companyName: current.opportunity.companyName,
      positionTitle: current.opportunity.positionTitle,
      location: current.opportunity.location,
      description: current.opportunity.description,
      url: current.opportunity.url,
    };
    const operations = await new OperationsStore(careerDataRoot()).load();
    const matchingJobIds = new Set(operations.jobs.filter((job) => job.url === current.opportunity.url
      || (job.company.trim().toLowerCase() === current.opportunity.companyName.trim().toLowerCase()
        && job.title.trim().toLowerCase() === current.opportunity.positionTitle.trim().toLowerCase())).map((job) => job.id));
    const selectedInsights = operations.companyInsights
      .filter((insight) => insight.kind === "company_overview")
      .filter((insight) => matchingJobIds.has(insight.jobId)
        || (insight.company.trim().toLowerCase() === current.opportunity.companyName.trim().toLowerCase()
          && insight.role.trim().toLowerCase() === current.opportunity.positionTitle.trim().toLowerCase()))
      .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt))
      .slice(0, 1)
      .map((insight) => ({ kind: insight.kind, report: insight.report }));
    const generation = await generateApplicationWriting(
      intake,
      profile,
      rejected.map((claim) => claim.text),
      input.refinementInstructions ?? "",
      selectedInsights,
      {
        positioningSummary: current.draft.summary,
        claims: current.draft.claims.map(({ text, kind, decision }) => ({ text, kind, decision })),
        coverLetter: current.draft.coverLetter,
      },
    );
    if (generation.method !== "ai") {
      return NextResponse.json({ error: generation.note }, { status: 503 });
    }
    const regenerated = applyAiWriting(current, generation);
    const application = await store.replaceDraft(input, regenerated.draft);
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to regenerate the draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
