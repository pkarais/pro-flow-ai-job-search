import { GmailSetupWorkspace } from "@/components/gmail-setup-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { gmailStatus } from "@/server/integrations/gmail-service";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function GmailPage({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string }> }) {
  const [query, requestHeaders] = await Promise.all([searchParams, headers()]);
  const host = requestHeaders.get("host") ?? "localhost:3000";
  return <GmailSetupWorkspace initialStatus={await gmailStatus(careerDataRoot())} callbackUrl={`http://${host}/api/integrations/gmail/callback`} error={query.error ?? ""} connected={query.connected ?? ""} />;
}
