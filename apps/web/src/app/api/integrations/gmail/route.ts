import { z } from "zod";
import { careerDataRoot } from "@/server/canonical/review-service";
import { disconnectGmail, gmailStatus, saveGmailConfig } from "@/server/integrations/gmail-service";

export async function GET() {
  return Response.json(await gmailStatus(careerDataRoot()), { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  try {
    const input = z.object({ clientId: z.string(), clientSecret: z.string() }).strict().parse(await request.json());
    await saveGmailConfig(careerDataRoot(), input);
    return Response.json(await gmailStatus(careerDataRoot()));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save Gmail configuration." }, { status: 400 });
  }
}

export async function DELETE() {
  await disconnectGmail(careerDataRoot());
  return Response.json(await gmailStatus(careerDataRoot()));
}
