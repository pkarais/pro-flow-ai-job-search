import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  effectiveEvidenceValue,
  jobSearchRequestSchema,
  normalizedJobSchema,
  portalRuntimeReportSchema,
  type CanonicalCareerProfile,
  type JobSearchRequest,
  type NormalizedJob,
  type PortalId,
  type PortalRuntimeReport,
} from "@pro-flow/career-core";

const execute = promisify(execFile);

const cliRoots: Record<PortalId, string> = {
  "freehire-search": ".agents/skills/freehire-search/cli/src/cli.ts",
  "linkedin-search": ".agents/skills/linkedin-search/cli/src/cli.ts",
  "jobbank-search": ".agents/skills/jobbank-search/cli/src/cli.ts",
  "jobdanmark-search": ".agents/skills/jobdanmark-search/cli/src/cli.ts",
  "jobindex-search": ".agents/skills/jobindex-search/cli/src/cli.ts",
  "jobnet-search": ".agents/skills/jobnet-search/cli/src/cli.ts",
};

const portalLabels: Record<PortalId, string> = {
  "freehire-search": "FreeHire",
  "linkedin-search": "LinkedIn",
  "jobbank-search": "Jobbank",
  "jobdanmark-search": "Jobdanmark",
  "jobindex-search": "Jobindex",
  "jobnet-search": "Jobnet",
};

const bunliPortals = new Set<PortalId>([
  "jobbank-search", "jobdanmark-search", "jobindex-search", "jobnet-search",
]);

const stopWords = new Set(["and", "the", "with", "for", "from", "this", "that", "your", "our", "job", "role"]);
function terms(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)?.filter((term) => !stopWords.has(term)) ?? [])];
}
function id(value: string): string {
  return `job_${createHash("sha256").update(value).digest("hex").slice(0, 18)}`;
}

export class PortalUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalUnavailableError";
  }
}

function repositoryRoot(): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), "../..");
}

export function buildPortalSearchArguments(request: JobSearchRequest): string[] {
  const query = request.location && request.portal !== "linkedin-search"
    ? `${request.query} ${request.location}`
    : request.query;
  const common = ["run", cliRoots[request.portal], "search"];
  switch (request.portal) {
    case "freehire-search":
      return [...common, "--query", query, "--jobage", "14", "--limit", String(request.limit), "--format", "json"];
    case "linkedin-search":
      return [...common, "--query", request.query, "--location", request.location!, "--jobage", "14", "--limit", String(request.limit), "--format", "json"];
    case "jobbank-search":
      return [...common, "--key", query, "--limit", String(request.limit), "--format", "json"];
    case "jobdanmark-search":
      return [...common, "--text", request.query, ...(request.location ? ["--municipality", request.location] : []), "--limit", String(request.limit), "--format", "json"];
    case "jobindex-search":
      return [...common, "--query", query, "--jobage", "14", "--limit", String(request.limit), "--format", "json"];
    case "jobnet-search":
      return [...common, "--search-string", query, "--limit", String(request.limit), "--format", "json"];
  }
}

function text(raw: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

export function normalizePortalResult(portal: PortalId, raw: Record<string, unknown>) {
  const externalId = text(raw, "id", "jobAdId", "slug");
  const url = text(raw, "url") ?? (portal === "jobnet-search" && externalId
    ? `https://jobnet.dk/job/${externalId}`
    : undefined);
  const location = text(raw, "location", "companyAddress", "municipality", "postalDistrictName");
  return {
    externalId,
    title: text(raw, "title"),
    company: text(raw, "company", "companyName", "hiringOrgName"),
    location,
    url,
    description: text(raw, "description"),
    postedAt: text(raw, "date", "publishedDate", "publicationDate"),
  };
}

export async function inspectPortalRuntime(): Promise<PortalRuntimeReport> {
  const checkedAt = new Date().toISOString();
  let bunVersion: string | undefined;
  try {
    ({ stdout: bunVersion } = await execute("bun", ["--version"], { windowsHide: true, timeout: 10_000 }));
    bunVersion = bunVersion.trim();
  } catch {
    return portalRuntimeReportSchema.parse({
      checkedAt,
      portals: Object.entries(portalLabels).map(([portal, label]) => ({
        portal: portal as PortalId,
        label,
        status: "unavailable",
        message: "Bun is not available to the web server. Restart it after adding Bun to PATH.",
      })),
    });
  }
  const root = repositoryRoot();
  const portals = await Promise.all(Object.entries(portalLabels).map(async ([portalValue, label]) => {
    const portal = portalValue as PortalId;
    try {
      await access(path.join(/* turbopackIgnore: true */ root, cliRoots[portal]));
      if (bunliPortals.has(portal)) {
        await access(path.join(/* turbopackIgnore: true */ root, ".agents", "skills", portal, "cli", "node_modules"));
      }
      return { portal, label, status: "ready" as const, message: "Local adapter and runtime are ready." };
    } catch {
      return {
        portal,
        label,
        status: "needs_setup" as const,
        message: bunliPortals.has(portal)
          ? "Install this portal's local dependencies with bun install."
          : "The installed portal CLI could not be found.",
      };
    }
  }));
  return portalRuntimeReportSchema.parse({ bunVersion, checkedAt, portals });
}

export async function searchPortal(
  requestInput: JobSearchRequest,
  profile: CanonicalCareerProfile,
): Promise<NormalizedJob[]> {
  const request = jobSearchRequestSchema.parse(requestInput);
  try {
    await execute("bun", ["--version"], { windowsHide: true, timeout: 10_000 });
  } catch {
    throw new PortalUnavailableError("Bun is not installed. Portal adapters are isolated and no search was attempted.");
  }
  if (request.portal === "linkedin-search" && !request.location) {
    throw new Error("LinkedIn search requires a location.");
  }
  const args = buildPortalSearchArguments(request);
  let stdout: string;
  try {
    ({ stdout } = await execute("bun", args, { cwd: repositoryRoot(), windowsHide: true, timeout: 60_000, maxBuffer: 10_000_000 }));
  } catch (error) {
    throw new PortalUnavailableError(`The ${request.portal} adapter failed without affecting other portals: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  let payload: { results?: Array<Record<string, unknown>> };
  try {
    payload = JSON.parse(stdout) as { results?: Array<Record<string, unknown>> };
  } catch {
    throw new PortalUnavailableError(`The ${request.portal} adapter returned an invalid response. No search results were stored.`);
  }
  const evidenceTerms = new Set(terms(profile.records.map((record) => effectiveEvidenceValue(record) ?? "").join(" ")));
  const now = new Date().toISOString();
  return (payload.results ?? []).flatMap((raw) => {
    const normalized = normalizePortalResult(request.portal, raw);
    const title = normalized.title ?? "";
    const company = normalized.company ?? "";
    const url = normalized.url ?? "";
    if (!title || !company || !url) return [];
    const description = normalized.description;
    const postingTerms = terms(`${title} ${description ?? ""}`);
    const matchedTerms = postingTerms.filter((term) => evidenceTerms.has(term)).slice(0, 20);
    const gaps = postingTerms.filter((term) => !evidenceTerms.has(term)).slice(0, 10);
    const score = Math.round(100 * matchedTerms.length / Math.max(1, matchedTerms.length + gaps.length));
    return [normalizedJobSchema.parse({
      id: id(`${company}:${title}:${url}`),
      portal: request.portal,
      externalId: normalized.externalId ?? url,
      title,
      company,
      location: normalized.location,
      url,
      description,
      postedAt: normalized.postedAt,
      score,
      matchedTerms,
      gaps,
      firstSeenAt: now,
    })];
  });
}
