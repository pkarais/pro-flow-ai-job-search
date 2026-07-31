import { NextResponse } from "next/server";
import { inspectPortalRuntime } from "@/server/operations/portal-adapter";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await inspectPortalRuntime());
}
