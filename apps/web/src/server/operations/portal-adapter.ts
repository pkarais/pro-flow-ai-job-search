import {
  jobSearchRequestSchema,
  portalGroupPortals,
  portalGroupSearchRequestSchema,
  portalRuntimeReportSchema,
  type JobSearchRequest,
  type PortalGroupSearchRequest,
  type PortalId,
  type PortalRuntimeReport,
} from "@pro-flow/career-core";

const portalLabels: Record<PortalId, string> = {
  "linkedin-search": "LinkedIn",
  "indeed-search": "Indeed",
  "usajobs-search": "USAJOBS",
  "dice-search": "Dice",
  "builtin-search": "Built In",
  "wellfound-search": "Wellfound",
};

const portalGuidance: Record<PortalId, string> = {
  "linkedin-search": "Broad professional network and employer listings.",
  "indeed-search": "Broad U.S. job coverage through Indeed's official search.",
  "usajobs-search": "Official federal employment opportunities.",
  "dice-search": "Technology and technical professional roles.",
  "builtin-search": "Technology-company and startup roles.",
  "wellfound-search": "Startup and growth-company opportunities.",
};

function searchUrl(base: string, parameters: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}

export function buildOfficialSearchUrl(requestInput: JobSearchRequest): string {
  const request = jobSearchRequestSchema.parse(requestInput);
  const location = request.location?.trim() || "United States";
  switch (request.portal) {
    case "linkedin-search":
      return searchUrl("https://www.linkedin.com/jobs/search/", {
        keywords: request.query,
        location,
        f_TPR: "r1209600",
      });
    case "indeed-search":
      return searchUrl("https://www.indeed.com/jobs", {
        q: request.query,
        l: location,
        fromage: "14",
      });
    case "usajobs-search":
      return searchUrl("https://www.usajobs.gov/Search/Results", {
        k: request.query,
        l: location,
        p: "1",
      });
    case "dice-search":
      return searchUrl("https://www.dice.com/jobs", {
        q: request.query,
        location,
      });
    case "builtin-search":
      return searchUrl("https://builtin.com/jobs", {
        search: request.query,
        location,
      });
    case "wellfound-search":
      return searchUrl("https://wellfound.com/jobs", {
        role: request.query,
        location,
      });
  }
}

export function buildOfficialSearchUrls(requestInput: PortalGroupSearchRequest) {
  const request = portalGroupSearchRequestSchema.parse(requestInput);
  return portalGroupPortals[request.group].map((portal) => ({
    portal,
    label: portalLabels[portal],
    url: buildOfficialSearchUrl({
      portal,
      query: request.query,
      location: request.location,
      limit: 10,
    }),
  }));
}

export function inspectPortalRuntime(now = new Date()): PortalRuntimeReport {
  return portalRuntimeReportSchema.parse({
    checkedAt: now.toISOString(),
    portals: Object.entries(portalLabels).map(([portal, label]) => ({
      portal: portal as PortalId,
      label,
      status: "ready",
      searchMode: "official_search",
      message: portalGuidance[portal as PortalId],
    })),
  });
}
