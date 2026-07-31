import { jobSearchRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { buildOfficialSearchUrl } from "@/server/operations/portal-adapter";

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
