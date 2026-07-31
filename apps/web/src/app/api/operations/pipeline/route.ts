import { pipelineTransitionRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { careerDataRoot } from "@/server/canonical/review-service";
import { transitionPipeline } from "@/server/operations/operations-service";

export async function POST(request: Request) {
  try {
    const state = await transitionPipeline(careerDataRoot(), pipelineTransitionRequestSchema.parse(await request.json()));
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transition failed." }, { status: 400 });
  }
}
