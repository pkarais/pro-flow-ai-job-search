import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  archivedApplicationSchema,
  claimDecisionRequestSchema,
  regenerateDraftRequestSchema,
  type ArchivedApplication,
  type ApplicationDraft,
  type ClaimDecisionRequest,
  type RegenerateDraftRequest,
} from "@pro-flow/career-core";
import { RevisionConflictError } from "../canonical/canonical-store.ts";

async function atomicWrite(target: string, contents: string): Promise<void> {
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
  await rename(temporary, target);
}

export class ApplicationStore {
  private readonly root: string;

  constructor(dataRoot: string) {
    this.root = path.resolve(dataRoot, "applications");
  }

  async saveNew(application: ArchivedApplication): Promise<ArchivedApplication> {
    const parsed = archivedApplicationSchema.parse(application);
    await mkdir(this.root, { recursive: true });
    await atomicWrite(this.file(parsed.id), `${JSON.stringify(parsed, null, 2)}\n`);
    return parsed;
  }

  async load(id: string): Promise<ArchivedApplication | null> {
    try {
      return archivedApplicationSchema.parse(JSON.parse(await readFile(this.file(id), "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const archiveFile = this.file(id);
    const artifactDirectory = this.directory(id);
    await Promise.all([
      rm(archiveFile, { force: true }),
      rm(artifactDirectory, { recursive: true, force: true }),
    ]);
  }

  async decide(input: ClaimDecisionRequest, now = new Date()): Promise<ArchivedApplication> {
    const request = claimDecisionRequestSchema.parse(input);
    const current = await this.load(request.applicationId);
    if (!current) throw new Error("Application archive not found.");
    if (current.revision !== request.expectedRevision) throw new RevisionConflictError(current.revision);
    const claims = current.draft.claims.map((claim) => claim.id === request.claimId
      ? { ...claim, decision: request.decision, reviewedAt: now.toISOString() }
      : claim);
    if (!claims.some((claim) => claim.id === request.claimId)) throw new Error("Claim not found.");
    const complete = claims.every((claim) => claim.decision !== "pending");
    const next = archivedApplicationSchema.parse({
      ...current,
      revision: current.revision + 1,
      status: complete ? "review_complete" : "factual_review",
      draft: { ...current.draft, claims },
      updatedAt: now.toISOString(),
    });
    await atomicWrite(this.file(next.id), `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  async replaceDraft(
    input: RegenerateDraftRequest,
    draft: ApplicationDraft,
    now = new Date(),
  ): Promise<ArchivedApplication> {
    const request = regenerateDraftRequestSchema.parse(input);
    const current = await this.load(request.applicationId);
    if (!current) throw new Error("Application archive not found.");
    if (current.revision !== request.expectedRevision) throw new RevisionConflictError(current.revision);
    if (draft.claims.some((claim) => claim.decision !== "pending")) {
      throw new Error("A regenerated draft must return every new claim to factual review.");
    }
    const next = archivedApplicationSchema.parse({
      ...current,
      revision: current.revision + 1,
      status: "factual_review",
      draft,
      draftHistory: [
        ...(current.draftHistory ?? []),
        { revision: current.revision, archivedAt: now.toISOString(), draft: current.draft },
      ].slice(-20),
      updatedAt: now.toISOString(),
    });
    await atomicWrite(this.file(next.id), `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  private file(id: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new Error("Invalid application ID.");
    return path.join(this.root, `${id}.json`);
  }

  private directory(id: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new Error("Invalid application ID.");
    return path.join(this.root, id);
  }
}
