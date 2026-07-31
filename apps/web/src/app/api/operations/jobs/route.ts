import { jobImportRequestSchema } from "@pro-flow/career-core";
import { NextResponse } from "next/server";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { deleteJob, importJob } from "@/server/operations/operations-service";
import { recordExtensionCheckIn } from "@/server/extension/extension-status";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if ((origin?.startsWith("chrome-extension://") || origin?.startsWith("moz-extension://"))
      && request.headers.get("x-pro-flow-capture") !== "user-initiated-v1") {
      return NextResponse.json({ error: "The browser capture request is invalid." }, { status: 403 });
    }
    const input = jobImportRequestSchema.parse(await request.json());
    const state = await importJob(careerDataRoot(), input, await loadCanonicalProfile());
    if ((origin?.startsWith("chrome-extension://") || origin?.startsWith("moz-extension://"))
      && request.headers.get("x-pro-flow-capture") === "user-initiated-v1") {
      await recordExtensionCheckIn();
    }
    const response = NextResponse.json({ state });
    if (origin?.startsWith("chrome-extension://") || origin?.startsWith("moz-extension://")) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The job could not be imported." },
      { status: 400 },
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin?.startsWith("chrome-extension://") && !origin?.startsWith("moz-extension://")) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "content-type,x-pro-flow-capture",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Max-Age": "600",
    },
  });
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as { jobId?: unknown };
    if (typeof body.jobId !== "string") throw new Error("Select a saved job to delete.");
    const state = await deleteJob(careerDataRoot(), body.jobId);
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The saved job could not be deleted." },
      { status: 400 },
    );
  }
}
