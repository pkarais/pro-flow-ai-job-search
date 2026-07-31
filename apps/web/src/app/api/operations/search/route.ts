import { jobSearchRequestSchema, portalGroupSearchRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { careerDataRoot } from "@/server/canonical/review-service";
import { recordSearchRun } from "@/server/operations/operations-service";
import { buildOfficialSearchUrl, buildOfficialSearchUrls, normalizeUsLocation } from "@/server/operations/portal-adapter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = jobSearchRequestSchema.parse({
      portal: url.searchParams.get("portal"),
      query: url.searchParams.get("query"),
      location: url.searchParams.get("location") || "United States",
      limit: 10,
    });
    return NextResponse.redirect(buildOfficialSearchUrl(input), 307);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search request is invalid." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const parsed = portalGroupSearchRequestSchema.parse(await request.json());
    const input = { ...parsed, location: normalizeUsLocation(parsed.location) };
    const searches = buildOfficialSearchUrls(input);
    const next = await recordSearchRun(careerDataRoot(), input);
    return NextResponse.json({ searches, stateRevision: next.revision });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search request is invalid." },
      { status: 400 },
    );
  }
}
