import { ApplicationArchiveWorkspace } from "@/components/application-archive-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { listApplicationArchives } from "@/server/operations/operations-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { DocumentService } from "@/server/documents/document-service";

export const dynamic = "force-dynamic";

export default async function ApplicationArchivePage() {
  const dataRoot = careerDataRoot();
  const [applications, operations] = await Promise.all([
    listApplicationArchives(dataRoot),
    new OperationsStore(dataRoot).load(),
  ]);
  const readiness = await Promise.all(
    applications.map((application) => new DocumentService(dataRoot).load(application.id)),
  );
  return <ApplicationArchiveWorkspace
    initialApplications={applications}
    dismissedApplicationIds={operations.dismissedApplicationIds}
    initialReadiness={readiness}
  />;
}
