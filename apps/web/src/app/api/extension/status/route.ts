import { NextResponse } from "next/server";
import { readExtensionStatus, recordExtensionCheckIn } from "@/server/extension/extension-status";

export const runtime = "nodejs";

function extensionOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin?.startsWith("chrome-extension://") || origin?.startsWith("moz-extension://") ? origin : null;
}

export async function GET() {
  return NextResponse.json(await readExtensionStatus());
}

export async function POST(request: Request) {
  const origin = extensionOrigin(request);
  if (!origin || request.headers.get("x-pro-flow-extension") !== "installed-v1") {
    return NextResponse.json({ error: "Only an installed browser extension can check in." }, { status: 403 });
  }
  const response = NextResponse.json(await recordExtensionCheckIn());
  response.headers.set("Access-Control-Allow-Origin", origin);
  return response;
}

export async function OPTIONS(request: Request) {
  const origin = extensionOrigin(request);
  if (!origin) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "x-pro-flow-extension",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  } });
}
