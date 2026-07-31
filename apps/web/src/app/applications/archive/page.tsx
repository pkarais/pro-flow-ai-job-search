import { ApplicationArchiveWorkspace } from "@/components/application-archive-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { listApplicationArchives } from "@/server/operations/operations-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { DocumentService } from "@/server/documents/document-service";
import { syncHybridVault } from "@/server/vault/hybrid-vault";
import { buildApplicationArtifactBundle, persistApplicationCaseFile } from "@/server/documents/artifact-bundle";

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
  const vaultSummary = await syncHybridVault(dataRoot, applications, readiness, operations);
  const caseFiles = await Promise.all(applications.map(async (application) => {
    const documentRecord = readiness.find((record) => record?.applicationId === application.id);
    if (!documentRecord?.artifacts.length) return null;
    const relatedApplications = applications.filter((candidate) => candidate.opportunity.url === application.opportunity.url
      || (candidate.opportunity.companyName.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase()
        && candidate.opportunity.positionTitle.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase()));
    const bundle = await buildApplicationArtifactBundle(dataRoot, application.id, application, operations, relatedApplications);
    return persistApplicationCaseFile(dataRoot, application, bundle);
  }));
  const supplementalByApplication = Object.fromEntries(applications.map((application) => {
    const relatedIds = new Set(applications.filter((candidate) => candidate.opportunity.url === application.opportunity.url
      || (candidate.opportunity.companyName.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase()
        && candidate.opportunity.positionTitle.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase())).map((candidate) => candidate.id));
    const matchingJobIds = new Set(operations.jobs.filter((job) => job.url === application.opportunity.url
      || (job.company.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase()
        && job.title.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase())).map((job) => job.id));
    return [application.id, {
      insights: operations.companyInsights.filter((report) => matchingJobIds.has(report.jobId)
        || (report.company.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase()
          && report.role.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase())).length,
      interviews: operations.interviews.filter((pack) => relatedIds.has(pack.applicationId)).length,
    }];
  }));
  return <ApplicationArchiveWorkspace
    initialApplications={applications}
    dismissedApplicationIds={operations.dismissedApplicationIds}
    initialReadiness={readiness}
    vaultSummary={{ ...vaultSummary, caseFiles: caseFiles.filter(Boolean).length }}
    supplementalByApplication={supplementalByApplication}
  />;
}
