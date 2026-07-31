import { InterviewWorkspace } from "@/components/interview-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { listApplications } from "@/server/operations/operations-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { loadCanonicalProfile } from "@/server/canonical/review-service";
import { resolveCandidateContact } from "@/server/canonical/candidate-contact-service";

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  const [state, applications, profile] = await Promise.all([
    new OperationsStore(careerDataRoot()).load(),
    listApplications(careerDataRoot()),
    loadCanonicalProfile(),
  ]);
  const contact = await resolveCandidateContact(careerDataRoot(), profile);
  return <InterviewWorkspace
    initialApplications={applications.filter((application) => !state.dismissedApplicationIds.includes(application.id))}
    initialState={state}
    selfEmail={contact.email}
    selfPhone={contact.phone}
  />;
}
