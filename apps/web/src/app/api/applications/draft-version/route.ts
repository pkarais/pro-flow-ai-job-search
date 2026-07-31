import { z } from "zod";
import { careerDataRoot } from "@/server/canonical/review-service";
import { ApplicationStore } from "@/server/applications/application-store";

const inputSchema = z.object({ applicationId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/), expectedRevision: z.number().int().positive(), draftRevision: z.number().int().positive(), action: z.enum(["restore", "delete"]) }).strict();

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const store = new ApplicationStore(careerDataRoot());
    const application = input.action === "restore"
      ? await store.restoreDraftVersion(input.applicationId, input.expectedRevision, input.draftRevision)
      : await store.deleteDraftVersion(input.applicationId, input.expectedRevision, input.draftRevision);
    return Response.json({ application });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update the saved draft version." }, { status: 400 });
  }
}
