import "server-only";

import { DocumentService } from "../documents/document-service";
import { listApplications } from "../operations/operations-service";
import { OperationsStore } from "../operations/operations-store";
import {
  careerDataRoot,
  loadCanonicalProfile,
  summarizeCanonicalReview,
} from "../canonical/review-service";
import {
  buildAcceptancePlan,
  type AcceptancePlan,
  type AcceptanceSnapshot,
} from "@/lib/acceptance";

export type AcceptanceDashboard = {
  plan: AcceptancePlan;
  snapshot: AcceptanceSnapshot;
  warning?: string;
};

export async function loadAcceptanceDashboard(): Promise<AcceptanceDashboard> {
  const root = careerDataRoot();
  try {
    const [profile, applications, operations] = await Promise.all([
      loadCanonicalProfile(),
      listApplications(root),
      new OperationsStore(root).load(),
    ]);
    const review = summarizeCanonicalReview(profile);
    const visibleApplications = applications.filter((application) => !operations.dismissedApplicationIds.includes(application.id));
    const readiness = await Promise.all(
      visibleApplications.map((application) => new DocumentService(root).load(application.id)),
    );
    const snapshot: AcceptanceSnapshot = {
      evidenceTotal: review.total,
      evidenceReviewed: review.total - review.pending,
      searches: operations.searches.length,
      applications: visibleApplications.length,
      reviewedApplications: visibleApplications.filter(
        (application) => application.status === "review_complete",
      ).length,
      readyDocuments: readiness.filter((manifest, index) =>
        manifest?.status === "ready"
        && manifest.applicationRevision === visibleApplications[index]?.revision
      ).length,
      pipelineRecords: operations.pipeline.length,
      interviews: operations.interviews.length,
      outcomes: operations.outcomes.length,
    };
    return { snapshot, plan: buildAcceptancePlan(snapshot) };
  } catch {
    const snapshot: AcceptanceSnapshot = {
      evidenceTotal: 0,
      evidenceReviewed: 0,
      searches: 0,
      applications: 0,
      reviewedApplications: 0,
      readyDocuments: 0,
      pipelineRecords: 0,
      interviews: 0,
      outcomes: 0,
    };
    return {
      snapshot,
      plan: buildAcceptancePlan(snapshot),
      warning: "Private progress could not be read. No data was changed; check the local data files and reload.",
    };
  }
}
