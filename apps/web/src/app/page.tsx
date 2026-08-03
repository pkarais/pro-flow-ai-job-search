import { Dashboard } from "@/components/dashboard";
import { loadAcceptanceDashboard } from "@/server/acceptance/acceptance-service";
import { connection } from "next/server";
import { loadAiUsageSummary } from "@/server/ai/ai-usage-store";

export default async function HomePage() {
  await connection();
  const dashboard = await loadAcceptanceDashboard();
  const aiUsage = await loadAiUsageSummary();
  return <Dashboard dashboard={dashboard} aiUsage={aiUsage} />;
}
