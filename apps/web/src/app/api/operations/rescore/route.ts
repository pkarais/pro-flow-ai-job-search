import { NextResponse } from "next/server";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { rescoreJobs } from "@/server/operations/operations-service";

export async function POST() {
  try {
    const state = await rescoreJobs(careerDataRoot(), await loadCanonicalProfile());
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Saved jobs could not be rescored." },
      { status: 400 },
    );
  }
}
