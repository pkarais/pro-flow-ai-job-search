export type AcceptanceSnapshot = {
  evidenceTotal: number;
  evidenceReviewed: number;
  searches: number;
  applications: number;
  reviewedApplications: number;
  readyDocuments: number;
  pipelineRecords: number;
  interviews: number;
  outcomes: number;
};

export type AcceptanceStep = {
  id: string;
  label: string;
  detail: string;
  href: string;
  action: string;
  complete: boolean;
  status: "complete" | "current" | "upcoming";
};

export type AcceptancePlan = {
  steps: AcceptanceStep[];
  completed: number;
  percent: number;
  next: AcceptanceStep | null;
};

const definitions = [
  {
    id: "evidence",
    label: "Review your career evidence",
    action: "Review evidence",
    href: "/career/import-review",
    detail: (snapshot: AcceptanceSnapshot) =>
      `${snapshot.evidenceReviewed} of ${snapshot.evidenceTotal} imported facts reviewed`,
    complete: (snapshot: AcceptanceSnapshot) =>
      snapshot.evidenceTotal > 0 && snapshot.evidenceReviewed === snapshot.evidenceTotal,
  },
  {
    id: "search",
    label: "Run a guided U.S. job search",
    action: "Search recent jobs",
    href: "/operations#search",
    detail: (snapshot: AcceptanceSnapshot) =>
      `${snapshot.searches} grouped portal ${snapshot.searches === 1 ? "search" : "searches"} recorded`,
    complete: (snapshot: AcceptanceSnapshot) => snapshot.searches > 0,
  },
  {
    id: "application",
    label: "Create a grounded application",
    action: "Open Application Studio",
    href: "/applications/new",
    detail: (snapshot: AcceptanceSnapshot) =>
      `${snapshot.applications} application ${snapshot.applications === 1 ? "archive" : "archives"} created`,
    complete: (snapshot: AcceptanceSnapshot) => snapshot.applications > 0,
  },
  {
    id: "claims",
    label: "Complete factual claim review",
    action: "Review application claims",
    href: "/applications/new#workspace",
    detail: (snapshot: AcceptanceSnapshot) =>
      `${snapshot.reviewedApplications} application ${snapshot.reviewedApplications === 1 ? "has" : "have"} completed review`,
    complete: (snapshot: AcceptanceSnapshot) => snapshot.reviewedApplications > 0,
  },
  {
    id: "documents",
    label: "Generate and verify documents",
    action: "Verify documents",
    href: "/applications/new#documents",
    detail: (snapshot: AcceptanceSnapshot) =>
      `${snapshot.readyDocuments} document ${snapshot.readyDocuments === 1 ? "package is" : "packages are"} submission-ready`,
    complete: (snapshot: AcceptanceSnapshot) => snapshot.readyDocuments > 0,
  },
  {
    id: "pipeline",
    label: "Move the application into the pipeline",
    action: "Open pipeline",
    href: "/operations#pipeline",
    detail: (snapshot: AcceptanceSnapshot) =>
      `${snapshot.pipelineRecords} tracked pipeline ${snapshot.pipelineRecords === 1 ? "record" : "records"}`,
    complete: (snapshot: AcceptanceSnapshot) => snapshot.pipelineRecords > 0,
  },
  {
    id: "interview",
    label: "Prepare an interview pack",
    action: "Prepare for an interview",
    href: "/interview",
    detail: (snapshot: AcceptanceSnapshot) =>
      `${snapshot.interviews} grounded interview ${snapshot.interviews === 1 ? "pack" : "packs"} generated`,
    complete: (snapshot: AcceptanceSnapshot) => snapshot.interviews > 0,
  },
  {
    id: "outcome",
    label: "Record an outcome",
    action: "Record outcome",
    href: "/interview",
    detail: (snapshot: AcceptanceSnapshot) =>
      `${snapshot.outcomes} career ${snapshot.outcomes === 1 ? "outcome" : "outcomes"} recorded`,
    complete: (snapshot: AcceptanceSnapshot) => snapshot.outcomes > 0,
  },
] as const;

export function buildAcceptancePlan(snapshot: AcceptanceSnapshot): AcceptancePlan {
  const firstIncomplete = definitions.findIndex((step) => !step.complete(snapshot));
  const steps = definitions.map((step, index): AcceptanceStep => {
    const complete = step.complete(snapshot);
    return {
      id: step.id,
      label: step.label,
      detail: step.detail(snapshot),
      href: step.href,
      action: step.action,
      complete,
      status: complete ? "complete" : index === firstIncomplete ? "current" : "upcoming",
    };
  });
  const completed = steps.filter((step) => step.complete).length;
  return {
    steps,
    completed,
    percent: Math.round((completed / steps.length) * 100),
    next: steps.find((step) => step.status === "current") ?? null,
  };
}
