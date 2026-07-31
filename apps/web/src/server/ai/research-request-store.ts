import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { careerDataRoot } from "@/server/canonical/review-service";
import type { CompanyResearchKind } from "./company-insights-service";

type PendingResearch = {
  jobId: string;
  kind: CompanyResearchKind;
  responseId: string;
  startedAt: string;
};

const filePath = () => path.join(careerDataRoot(), "pending-company-research.json");

async function load(): Promise<PendingResearch[]> {
  try {
    const parsed = JSON.parse(await readFile(filePath(), "utf8"));
    return Array.isArray(parsed) ? parsed.filter((item): item is PendingResearch =>
      typeof item?.jobId === "string"
      && (item?.kind === "company_overview" || item?.kind === "direct_application")
      && typeof item?.responseId === "string"
      && item.responseId.startsWith("resp")) : [];
  } catch {
    return [];
  }
}

async function save(records: PendingResearch[]) {
  const target = filePath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

export async function rememberResearchRequest(record: PendingResearch) {
  const current = await load();
  await save([...current.filter((item) => item.jobId !== record.jobId || item.kind !== record.kind), record]);
}

export async function findResearchRequest(jobId: string, kind: CompanyResearchKind) {
  return (await load()).find((item) => item.jobId === jobId && item.kind === kind) ?? null;
}

export async function forgetResearchRequest(jobId: string, kind: CompanyResearchKind) {
  const current = await load();
  await save(current.filter((item) => item.jobId !== jobId || item.kind !== kind));
}
