import { ApplicationWorkspace } from "@/components/application-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { OperationsWorkspace } from "@/components/operations-workspace";
import { listApplications } from "@/server/operations/operations-service";
import { inspectPortalRuntime } from "@/server/operations/portal-adapter";
import { deriveSearchDefaults } from "@/server/operations/search-defaults";
import { loadCanonicalProfile } from "@/server/canonical/review-service";
import Link from "next/link";
import { DocumentService } from "@/server/documents/document-service";
import { resolveCandidateContact } from "@/server/canonical/candidate-contact-service";
import { listResearchRequests } from "@/server/ai/research-request-store";

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string | string[]; applicationId?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedJobId = query.jobId;
  const jobId = typeof requestedJobId === "string" ? requestedJobId : undefined;
  const applicationId = typeof query.applicationId === "string" ? query.applicationId : undefined;
  const [operations, applications, runtime, profile, pendingResearch] = await Promise.all([
    new OperationsStore(careerDataRoot()).load(),
    listApplications(careerDataRoot()),
    inspectPortalRuntime(),
    loadCanonicalProfile(),
    listResearchRequests(),
  ]);
  const visibleApplications = applications.filter((application) => !operations.dismissedApplicationIds.includes(application.id));
  const job = operations.jobs.find((item) => item.id === jobId);
  const selectedApplication = visibleApplications.find((application) => application.id === applicationId);
  const loadedReadiness = selectedApplication ? await new DocumentService(careerDataRoot()).load(selectedApplication.id) : null;
  const selectedReadiness = loadedReadiness?.applicationRevision === selectedApplication?.revision ? loadedReadiness : null;
  const matchingJobIds = new Set(selectedApplication ? operations.jobs.filter((candidate) => candidate.url === selectedApplication.opportunity.url
    || (candidate.company.trim().toLowerCase() === selectedApplication.opportunity.companyName.trim().toLowerCase()
      && candidate.title.trim().toLowerCase() === selectedApplication.opportunity.positionTitle.trim().toLowerCase())).map((candidate) => candidate.id) : []);
  const relatedInsights = selectedApplication ? operations.companyInsights.filter((insight) => insight.kind === "company_overview" && (matchingJobIds.has(insight.jobId)
    || (insight.company.trim().toLowerCase() === selectedApplication.opportunity.companyName.trim().toLowerCase()
      && insight.role.trim().toLowerCase() === selectedApplication.opportunity.positionTitle.trim().toLowerCase())))
    .sort((left, right) => Date.parse(right.generatedAt) - Date.parse(left.generatedAt))
    .slice(0, 1) : [];
  const candidateContact = selectedApplication ? await resolveCandidateContact(careerDataRoot(), profile) : null;
  const focusedJob = selectedApplication ? operations.jobs.find((candidate) => matchingJobIds.has(candidate.id)) : job;
  const defaults = deriveSearchDefaults(profile, undefined, operations.searches.map((search) => search.query).reverse(), operations.searches.map((search) => search.location).reverse());
  const studio = selectedApplication ? <ApplicationWorkspace initialApplication={selectedApplication} initialReadiness={selectedReadiness} availableInsights={relatedInsights} initialIdentity={candidateContact ? { fullName: candidateContact.fullName, email: candidateContact.email, phone: candidateContact.phone } : undefined} initialThemeId={loadedReadiness?.themeId} initialPaletteId={loadedReadiness?.paletteId} /> : job ? <ApplicationWorkspace initialOpportunity={{
    companyName: job.company,
    positionTitle: job.title,
    location: job.location ?? "",
    url: job.url,
    description: job.description ?? "",
  }} /> : undefined;

  return (
    <>
      <div className="application-archive-link"><Link className="button button--secondary" href="/applications/archive">Manage application archives</Link></div>
      <OperationsWorkspace initialApplications={visibleApplications} initialRuntimeReport={runtime} initialState={operations} initialResearch={pendingResearch} searchDefaults={defaults} aiMarketInsight={null} view="applications" focusedJobId={focusedJob?.id} focusedApplicationId={selectedApplication?.id} expandedContent={studio} />
      {studio && !focusedJob ? studio : null}
      {!studio ? <div className="application-archive-link"><p>Select <strong>Create résumé &amp; cover letter</strong> or <strong>Open application studio &amp; refine</strong> on a saved opportunity above.</p></div> : null}
    </>
  );
}
