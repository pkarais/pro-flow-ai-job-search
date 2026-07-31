import { InterviewWorkspace } from "@/components/interview-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { listApplications } from "@/server/operations/operations-service";
import { OperationsStore } from "@/server/operations/operations-store";

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  const [state, applications] = await Promise.all([
    new OperationsStore(careerDataRoot()).load(),
    listApplications(careerDataRoot()),
  ]);
  return <InterviewWorkspace initialApplications={applications.filter((application) => !state.dismissedApplicationIds.includes(application.id))} initialState={state} />;
}
