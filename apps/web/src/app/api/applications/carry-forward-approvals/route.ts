import { z } from "zod";
import { NextResponse } from "next/server";
import { ApplicationStore } from "@/server/applications/application-store";
import { careerDataRoot } from "@/server/canonical/review-service";

export const runtime = "nodejs";
const requestSchema = z.object({ applicationId: z.string().min(1), expectedRevision: z.number().int().positive() }).strict();

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const application = await new ApplicationStore(careerDataRoot()).carryForwardPriorApprovals(input.applicationId, input.expectedRevision);
    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to carry forward prior approvals." }, { status: 400 });
  }
}
