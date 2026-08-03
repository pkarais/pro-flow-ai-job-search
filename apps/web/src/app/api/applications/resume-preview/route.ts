import { resumePreviewRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { ApplicationStore } from "@/server/applications/application-store";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { renderDesignedResumeHtml } from "@/server/documents/html-resume-renderer";
import { renderDesignedCoverLetterHtml } from "@/server/documents/cover-letter-renderer";
import { buildStructuredResume } from "@/server/documents/structured-resume-service";
import { loadCandidateBannerDataUri, loadCandidateSignatureDataUri } from "@/server/documents/candidate-signature";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = resumePreviewRequestSchema.parse(await request.json());
    const application = await new ApplicationStore(careerDataRoot()).load(input.applicationId);
    if (!application) return NextResponse.json({ error: "Application archive not found." }, { status: 404 });
    if (application.draft.generation?.method !== "ai") {
      return NextResponse.json(
        { error: "This application contains a fallback draft. Generate a fresh AI resume and cover letter before previewing." },
        { status: 409 },
      );
    }
    const profile = await loadCanonicalProfile();
    if (!profile) return NextResponse.json({ error: "Canonical career evidence is unavailable." }, { status: 409 });
    const resume = buildStructuredResume(application, profile, input.identity, input.themeId, input.paletteOverride);
    const signatureDataUri = await loadCandidateSignatureDataUri(careerDataRoot());
    const bannerDataUri = await loadCandidateBannerDataUri(careerDataRoot());
    return NextResponse.json({
      resume,
      html: renderDesignedResumeHtml(resume, bannerDataUri),
      coverHtml: renderDesignedCoverLetterHtml(resume, application.draft.coverLetter, signatureDataUri),
      contentSource: application.draft.generation?.method ?? "template",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to preview resume." },
      { status: 400 },
    );
  }
}
