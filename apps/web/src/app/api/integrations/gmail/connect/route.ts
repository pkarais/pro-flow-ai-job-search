import { careerDataRoot } from "@/server/canonical/review-service";
import { beginGmailOAuth } from "@/server/integrations/gmail-service";
import { localBrowserOrigin } from "@/server/integrations/local-browser-origin";

function callbackUri(request: Request) {
  return `${localBrowserOrigin(request)}/api/integrations/gmail/callback`;
}

export async function GET(request: Request) {
  try {
    return Response.redirect(await beginGmailOAuth(careerDataRoot(), callbackUri(request)));
  } catch (error) {
    let origin = "http://localhost:3000";
    try { origin = localBrowserOrigin(request); } catch {}
    const url = new URL("/gmail", origin);
    url.searchParams.set("error", error instanceof Error ? error.message : "Unable to connect Gmail.");
    return Response.redirect(url);
  }
}
