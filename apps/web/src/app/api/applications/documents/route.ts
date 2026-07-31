import { documentGenerationRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { ApplicationStore } from "@/server/applications/application-store";
import { careerDataRoot } from "@/server/canonical/review-service";
import { DocumentService } from "@/server/documents/document-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = documentGenerationRequestSchema.parse(await request.json());
    const applicationId = input.applicationId;
    const application = await new ApplicationStore(careerDataRoot()).load(applicationId);
    if (!application) return NextResponse.json({ error: "Application archive not found." }, { status: 404 });
    const readiness = await new DocumentService(careerDataRoot()).generate(application, input.identity);
    return NextResponse.json({ readiness });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate documents.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
