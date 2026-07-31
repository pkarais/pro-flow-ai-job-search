import { visualReviewRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { ApplicationStore } from "@/server/applications/application-store";
import { careerDataRoot } from "@/server/canonical/review-service";
import { DocumentService } from "@/server/documents/document-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = visualReviewRequestSchema.parse(await request.json());
    const application = await new ApplicationStore(careerDataRoot()).load(input.applicationId);
    if (!application || application.revision !== input.applicationRevision) {
      return NextResponse.json(
        { error: "Application changed; regenerate documents before visual review." },
        { status: 409 },
      );
    }
    const readiness = await new DocumentService(careerDataRoot()).confirmVisualReview(
      input.applicationId,
      input.applicationRevision,
    );
    return NextResponse.json({ readiness });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to confirm visual review." },
      { status: 400 },
    );
  }
}
