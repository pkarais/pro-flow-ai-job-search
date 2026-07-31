import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  operationsStateSchema,
  portalIdSchema,
  type OperationsState,
} from "@pro-flow/career-core";

async function atomicWrite(target: string, contents: string): Promise<void> {
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await rename(temporary, target);
        return;
      } catch (error) {
        if (!["EPERM", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "") || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
  } catch (error) {
    if (!["EPERM", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
    await copyFile(temporary, target);
    await unlink(temporary);
  }
}

export class OperationsStore {
  private readonly root: string;
  private readonly file: string;

  constructor(dataRoot: string) {
    this.root = path.resolve(dataRoot);
    this.file = path.join(this.root, "operations.json");
  }

  async load(): Promise<OperationsState> {
    try {
      const raw = JSON.parse(await readFile(this.file, "utf8")) as Record<string, unknown>;
      if (raw.schemaVersion === 1) {
        const jobs = Array.isArray(raw.jobs)
          ? raw.jobs.filter((job) =>
              typeof job === "object"
              && job !== null
              && portalIdSchema.safeParse((job as Record<string, unknown>).portal).success)
          : [];
        return operationsStateSchema.parse({ ...raw, schemaVersion: 5, jobs, searches: [], companyInsights: [], dismissedApplicationIds: [] });
      }
      if (raw.schemaVersion === 2) {
        return operationsStateSchema.parse({ ...raw, schemaVersion: 5, searches: [], companyInsights: [], dismissedApplicationIds: [] });
      }
      if (raw.schemaVersion === 3) {
        return operationsStateSchema.parse({ ...raw, schemaVersion: 5, companyInsights: [], dismissedApplicationIds: [] });
      }
      if (raw.schemaVersion === 4) {
        return operationsStateSchema.parse({ ...raw, schemaVersion: 5, dismissedApplicationIds: [] });
      }
      return operationsStateSchema.parse(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return operationsStateSchema.parse({
        schemaVersion: 5,
        revision: 0,
        jobs: [],
        searches: [],
        pipeline: [],
        interviews: [],
        outcomes: [],
        companyInsights: [],
        dismissedApplicationIds: [],
        updatedAt: new Date(0).toISOString(),
      });
    }
  }

  async save(state: OperationsState, expectedRevision: number): Promise<OperationsState> {
    const current = await this.load();
    if (current.revision !== expectedRevision) {
      throw new Error(`Operations changed at revision ${current.revision}. Reload before saving.`);
    }
    const next = operationsStateSchema.parse({
      ...state,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    });
    await mkdir(this.root, { recursive: true });
    await atomicWrite(this.file, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }
}
