import { careerDataRoot } from "@/server/canonical/review-service";
import {
  permanentlyDeleteApplication,
  restoreApplication,
} from "@/server/operations/operations-service";

export const runtime = "nodejs";

function applicationId(body: unknown) {
  const value = (body as { applicationId?: unknown } | null)?.applicationId;
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) {
    throw new Error("A valid application archive is required.");
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const id = applicationId(await request.json());
    await restoreApplication(careerDataRoot(), id);
    return Response.json({ message: "Application archive restored." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Archive restore failed." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = applicationId(await request.json());
    await permanentlyDeleteApplication(careerDataRoot(), id);
    return Response.json({ message: "Application archive permanently deleted." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Archive deletion failed." }, { status: 400 });
  }
}
