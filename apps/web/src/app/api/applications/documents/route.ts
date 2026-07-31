import { documentGenerationRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { ApplicationStore } from "@/server/applications/application-store";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { DocumentService } from "@/server/documents/document-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = documentGenerationRequestSchema.parse(await request.json());
    const applicationId = input.applicationId;
    const application = await new ApplicationStore(careerDataRoot()).load(applicationId);
    if (!application) return NextResponse.json({ error: "Application archive not found." }, { status: 404 });
    if (application.draft.generation?.method !== "ai") {
      return NextResponse.json(
        { error: "Final documents require a freshly authored and reviewed AI resume and cover letter." },
        { status: 409 },
      );
    }
    const profile = await loadCanonicalProfile();
    if (!profile) return NextResponse.json({ error: "Canonical career evidence is unavailable." }, { status: 409 });
    const readiness = await new DocumentService(careerDataRoot()).generate(
      application,
      input.identity,
      input.themeId,
      new Date(),
      profile,
      input.paletteOverride,
    );
    return NextResponse.json({ readiness });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate documents.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
