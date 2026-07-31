import { OperationsWorkspace } from "@/components/operations-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { listApplications } from "@/server/operations/operations-service";
import { OperationsStore } from "@/server/operations/operations-store";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [state, applications] = await Promise.all([
    new OperationsStore(careerDataRoot()).load(),
    listApplications(careerDataRoot()),
  ]);
  return <OperationsWorkspace initialApplications={applications} initialState={state} />;
}
