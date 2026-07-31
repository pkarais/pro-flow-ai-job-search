import { careerDataRoot } from "@/server/canonical/review-service";
import { beginGmailOAuth } from "@/server/integrations/gmail-service";

function callbackUri(request: Request) {
  const origin = new URL(request.url).origin;
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) throw new Error("Gmail setup is available only from the local Pro Flow application.");
  return `${origin}/api/integrations/gmail/callback`;
}

export async function GET(request: Request) {
  try {
    return Response.redirect(await beginGmailOAuth(careerDataRoot(), callbackUri(request)));
  } catch (error) {
    const url = new URL("/gmail", request.url);
    url.searchParams.set("error", error instanceof Error ? error.message : "Unable to connect Gmail.");
    return Response.redirect(url);
  }
}
