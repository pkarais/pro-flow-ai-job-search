import { OperationsWorkspace } from "@/components/operations-workspace";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { listApplications } from "@/server/operations/operations-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { inspectPortalRuntime } from "@/server/operations/portal-adapter";
import { loadUsAiMarketInsight } from "@/server/operations/market-insights";
import { deriveSearchDefaults } from "@/server/operations/search-defaults";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [state, applications, runtimeReport, profile, aiMarketInsight] = await Promise.all([
    new OperationsStore(careerDataRoot()).load(),
    listApplications(careerDataRoot()),
    inspectPortalRuntime(),
    loadCanonicalProfile(),
    loadUsAiMarketInsight(),
  ]);
  const visibleApplications = applications.filter((application) => !state.dismissedApplicationIds.includes(application.id));
  const searchDefaults = deriveSearchDefaults(
    profile,
    undefined,
    [
      ...state.searches.map((search) => search.query).reverse(),
      ...visibleApplications.map((application) => application.opportunity.positionTitle),
    ],
    state.searches.map((search) => search.location).reverse(),
  );
  return (
    <OperationsWorkspace
      initialApplications={visibleApplications}
      initialRuntimeReport={runtimeReport}
      initialState={state}
      searchDefaults={searchDefaults}
      aiMarketInsight={aiMarketInsight}
    />
  );
}
