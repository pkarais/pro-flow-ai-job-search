import { opportunityIntakeSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { ApplicationStore } from "@/server/applications/application-store";
import { buildApplication } from "@/server/applications/application-service";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const intake = opportunityIntakeSchema.parse(await request.json());
    const profile = await loadCanonicalProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Review and confirm career evidence before starting an application." },
        { status: 409 },
      );
    }
    const application = buildApplication(intake, profile);
    await new ApplicationStore(careerDataRoot()).saveNew(application);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the application.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
