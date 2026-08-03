import { copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
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
let mutationQueue: Promise<void> = Promise.resolve();
const startLocks = new Map<string, Promise<unknown>>();

const retryableWindowsError = (error: unknown) => ["EPERM", "EACCES", "EBUSY"].includes((error as NodeJS.ErrnoException).code ?? "");
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
  await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await rename(temporary, target);
        return;
      } catch (error) {
        if (!retryableWindowsError(error) || attempt === 7) throw error;
        await wait(Math.min(100 * (attempt + 1), 500));
      }
    }
  } catch (error) {
    if (!retryableWindowsError(error)) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
    try {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          await copyFile(temporary, target);
          await unlink(temporary).catch(() => undefined);
          return;
        } catch (copyError) {
          if (!retryableWindowsError(copyError) || attempt === 7) throw copyError;
          await wait(Math.min(100 * (attempt + 1), 500));
        }
      }
    } catch (copyError) {
      await unlink(temporary).catch(() => undefined);
      throw copyError;
    }
  }
}

async function mutate(update: (current: PendingResearch[]) => PendingResearch[]) {
  const operation = mutationQueue.then(async () => save(update(await load())));
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

export async function rememberResearchRequest(record: PendingResearch) {
  await mutate((current) => [...current.filter((item) => item.jobId !== record.jobId || item.kind !== record.kind), record]);
}

export async function findResearchRequest(jobId: string, kind: CompanyResearchKind) {
  return (await load()).find((item) => item.jobId === jobId && item.kind === kind) ?? null;
}

export async function listResearchRequests() {
  return load();
}

export async function forgetResearchRequest(jobId: string, kind: CompanyResearchKind) {
  await mutate((current) => current.filter((item) => item.jobId !== jobId || item.kind !== kind));
}

export async function withResearchStartLock<T>(jobId: string, kind: CompanyResearchKind, action: () => Promise<T>): Promise<T> {
  const key = `${jobId}:${kind}`;
  const prior = startLocks.get(key) ?? Promise.resolve();
  const current = prior.catch(() => undefined).then(action);
  startLocks.set(key, current);
  try {
    return await current;
  } finally {
    if (startLocks.get(key) === current) startLocks.delete(key);
  }
}
