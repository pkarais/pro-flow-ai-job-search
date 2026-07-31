import { OperationsWorkspace } from "@/components/operations-workspace";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { loadExecutiveEvidencePreview } from "@/server/evidence/preview-service";
import { listApplications } from "@/server/operations/operations-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { inspectPortalRuntime } from "@/server/operations/portal-adapter";
import { deriveSearchDefaults } from "@/server/operations/search-defaults";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [state, applications, runtimeReport, profile] = await Promise.all([
    new OperationsStore(careerDataRoot()).load(),
    listApplications(careerDataRoot()),
    inspectPortalRuntime(),
    loadCanonicalProfile(),
  ]);
  const previewState = profile ? null : await loadExecutiveEvidencePreview();
  const searchDefaults = deriveSearchDefaults(
    profile,
    previewState?.status === "ready" ? previewState.result : undefined,
    applications.map((application) => application.opportunity.positionTitle),
  );
  return (
    <OperationsWorkspace
      initialApplications={applications}
      initialRuntimeReport={runtimeReport}
      initialState={state}
      searchDefaults={searchDefaults}
    />
  );
}
