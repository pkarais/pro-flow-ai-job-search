import { careerDataRoot } from "@/server/canonical/review-service";
import { completeGmailOAuth } from "@/server/integrations/gmail-service";

export async function GET(request: Request) {
  const current = new URL(request.url);
  const destination = new URL("/gmail", current.origin);
  try {
    const code = current.searchParams.get("code");
    const state = current.searchParams.get("state");
    if (!code || !state) throw new Error(current.searchParams.get("error_description") ?? "Google did not return an authorization code.");
    const email = await completeGmailOAuth(careerDataRoot(), `${current.origin}/api/integrations/gmail/callback`, code, state);
    destination.searchParams.set("connected", email);
  } catch (error) {
    destination.searchParams.set("error", error instanceof Error ? error.message : "Unable to complete Gmail authorization.");
  }
  return Response.redirect(destination);
}
