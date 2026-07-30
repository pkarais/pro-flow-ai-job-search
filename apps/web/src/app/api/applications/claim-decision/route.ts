import { claimDecisionRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { ApplicationStore } from "@/server/applications/application-store";
import { RevisionConflictError } from "@/server/canonical/canonical-store";
import { careerDataRoot } from "@/server/canonical/review-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = claimDecisionRequestSchema.parse(await request.json());
    const application = await new ApplicationStore(careerDataRoot()).decide(input);
    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      return NextResponse.json({ error: error.message, currentRevision: error.currentRevision }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Unable to save the claim decision.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
