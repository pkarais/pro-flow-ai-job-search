import { InsightsWorkspace } from "@/components/insights-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { OperationsStore } from "@/server/operations/operations-store";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const state = await new OperationsStore(careerDataRoot()).load();
  return <InsightsWorkspace
    key={state.companyInsights.map((report) => `${report.id}:${report.generatedAt}`).join("|")}
    reports={state.companyInsights}
  />;
}
