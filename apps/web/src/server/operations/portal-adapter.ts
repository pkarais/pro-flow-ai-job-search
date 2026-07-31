import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import {
  effectiveEvidenceValue,
  jobSearchRequestSchema,
  normalizedJobSchema,
  type CanonicalCareerProfile,
  type JobSearchRequest,
  type NormalizedJob,
  type PortalId,
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
  const repositoryRoot = path.resolve(process.cwd(), "../..");
  const args = ["run", cliRoots[request.portal], "search", "--query", request.query, "--jobage", "14", "--limit", String(request.limit), "--format", "json"];
  if (request.portal === "linkedin-search") args.push("--location", request.location!);
  else if (request.location) args[args.indexOf(request.query)] = `${request.query} ${request.location}`;
  let stdout: string;
  try {
    ({ stdout } = await execute("bun", args, { cwd: repositoryRoot, windowsHide: true, timeout: 60_000, maxBuffer: 10_000_000 }));
  } catch (error) {
    throw new PortalUnavailableError(`The ${request.portal} adapter failed without affecting other portals: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  const payload = JSON.parse(stdout) as { results?: Array<Record<string, unknown>> };
  const evidenceTerms = new Set(terms(profile.records.map((record) => effectiveEvidenceValue(record) ?? "").join(" ")));
  const now = new Date().toISOString();
  return (payload.results ?? []).flatMap((raw) => {
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const company = typeof raw.company === "string" ? raw.company.trim() : "";
    const url = typeof raw.url === "string" ? raw.url : "";
    if (!title || !company || !url) return [];
    const description = typeof raw.description === "string" ? raw.description : undefined;
    const postingTerms = terms(`${title} ${description ?? ""}`);
    const matchedTerms = postingTerms.filter((term) => evidenceTerms.has(term)).slice(0, 20);
    const gaps = postingTerms.filter((term) => !evidenceTerms.has(term)).slice(0, 10);
    const score = Math.round(100 * matchedTerms.length / Math.max(1, matchedTerms.length + gaps.length));
    return [normalizedJobSchema.parse({
      id: id(`${company}:${title}:${url}`),
      portal: request.portal,
      externalId: String(raw.id ?? url),
      title,
      company,
      location: typeof raw.location === "string" ? raw.location : undefined,
      url,
      description,
      postedAt: typeof raw.date === "string" ? raw.date : undefined,
      score,
      matchedTerms,
      gaps,
      firstSeenAt: now,
    })];
  });
}
