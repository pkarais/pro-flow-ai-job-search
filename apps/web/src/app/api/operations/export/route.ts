import { NextResponse } from "next/server";
import { careerDataRoot } from "@/server/canonical/review-service";
import { OperationsStore } from "@/server/operations/operations-store";

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const state = await new OperationsStore(careerDataRoot()).load();
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format === "csv") {
    const headers = ["title", "company", "location", "portal", "score", "risk", "dealBreakers", "url", "firstSeenAt"];
    const rows = state.jobs.map((job) => [
      job.title, job.company, job.location, job.portal, job.score,
      job.riskReview?.score ?? "", job.dealBreakers, job.url, job.firstSeenAt,
    ].map(csvCell).join(","));
    return new NextResponse([headers.join(","), ...rows].join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="pro-flow-jobs.csv"',
      },
    });
  }
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), jobs: state.jobs }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="pro-flow-jobs.json"',
    },
  });
}
