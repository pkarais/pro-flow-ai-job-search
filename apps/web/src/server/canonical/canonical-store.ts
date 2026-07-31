import { randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  canonicalCareerProfileSchema,
  type CanonicalCareerProfile,
  type EvidenceImportResult,
} from "@pro-flow/career-core";
import {
  renderCompatibilityArtifacts,
  type CompatibilityArtifacts,
} from "./compatibility-renderer.ts";

const STORE_FILE = "canonical-career.json";
const PROFILE_VIEW_FILE = "canonical-profile.md";
const LEDGER_VIEW_FILE = "evidence-ledger.md";
const VIEW_MANIFEST_FILE = "manifest.json";

type LegacyCanonicalProfile = {
  schemaVersion: 0;
  candidateId?: string;
  revision?: number;
  sourceImportedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  records?: unknown[];
};

export class RevisionConflictError extends Error {
  readonly currentRevision: number;

  constructor(currentRevision: number) {
    super(`The canonical profile changed at revision ${currentRevision}. Reload before saving.`);
    this.name = "RevisionConflictError";
    this.currentRevision = currentRevision;
  }
}

export class SourceEvidenceChangedError extends Error {
  readonly factId: string;

  constructor(factId: string) {
    super(`Source evidence changed for ${factId}; review the latest import before deciding.`);
    this.name = "SourceEvidenceChangedError";
    this.factId = factId;
  }
}

function nowIso(now: Date): string {
  return now.toISOString();
}

function safeTimestamp(value: string): string {
  return value.replace(/[:.]/g, "-");
}

export function createCanonicalProfile(
  imported: EvidenceImportResult,
  now = new Date(),
): CanonicalCareerProfile {
  const timestamp = nowIso(now);
  return canonicalCareerProfileSchema.parse({
    schemaVersion: 1,
    candidateId: "primary_candidate",
    revision: 1,
    sourceImportedAt: imported.importedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
    records: imported.facts.map((fact) => ({
      ...fact,
      decision: "pending",
    })),
    compatibility: { generatedFromRevision: 0 },
  });
}

export function migrateCanonicalProfile(input: unknown): CanonicalCareerProfile {
  if (typeof input !== "object" || input === null || !("schemaVersion" in input)) {
    throw new Error("Canonical profile has no schema version.");
  }
  const version = (input as { schemaVersion: unknown }).schemaVersion;
  if (version === 1) return canonicalCareerProfileSchema.parse(input);
  if (version === 0) {
    const legacy = input as LegacyCanonicalProfile;
    const timestamp = legacy.updatedAt ?? legacy.createdAt ?? new Date(0).toISOString();
    return canonicalCareerProfileSchema.parse({
      schemaVersion: 1,
      candidateId: legacy.candidateId ?? "primary_candidate",
      revision: Math.max(1, legacy.revision ?? 1),
      sourceImportedAt: legacy.sourceImportedAt ?? timestamp,
      createdAt: legacy.createdAt ?? timestamp,
      updatedAt: timestamp,
      records: (legacy.records ?? []).map((record) => ({
        ...(record as object),
        decision: "pending",
      })),
      compatibility: { generatedFromRevision: 0 },
    });
  }
  throw new Error(`Unsupported canonical profile schema version: ${String(version)}`);
}

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(target: string, contents: string): Promise<void> {
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, contents, { encoding: "utf8", flag: "wx" });
  await rename(temporary, target);
}

export class CanonicalProfileStore {
  private readonly dataRoot: string;
  private readonly storePath: string;
  private readonly backupDirectory: string;
  private readonly compatibilityDirectory: string;

  constructor(dataRoot: string) {
    const resolved = path.resolve(dataRoot);
    this.dataRoot = resolved;
    this.storePath = path.join(resolved, STORE_FILE);
    this.backupDirectory = path.join(resolved, "backups");
    this.compatibilityDirectory = path.join(resolved, "compatibility");
  }

  async load(): Promise<CanonicalCareerProfile | null> {
    try {
      const raw = await readFile(this.storePath, "utf8");
      return migrateCanonicalProfile(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async save(
    profileInput: CanonicalCareerProfile,
    expectedRevision: number | null,
    now = new Date(),
  ): Promise<CanonicalCareerProfile> {
    const current = await this.load();
    const currentRevision = current?.revision ?? 0;
    if (expectedRevision !== null && expectedRevision !== currentRevision) {
      throw new RevisionConflictError(currentRevision);
    }

    const nextRevision = currentRevision + 1;
    const base = canonicalCareerProfileSchema.parse({
      ...profileInput,
      revision: nextRevision,
      createdAt: current?.createdAt ?? profileInput.createdAt,
      updatedAt: nowIso(now),
      compatibility: { generatedFromRevision: 0 },
    });
    const artifacts = renderCompatibilityArtifacts(base);
    const next = canonicalCareerProfileSchema.parse({
      ...base,
      compatibility: {
        generatedFromRevision: nextRevision,
        profileSha256: artifacts.profileSha256,
        ledgerSha256: artifacts.ledgerSha256,
      },
    });

    await mkdir(this.dataRoot, { recursive: true });
    await mkdir(this.backupDirectory, { recursive: true });
    await mkdir(this.compatibilityDirectory, { recursive: true });

    if (current && await exists(this.storePath)) {
      const backupName = `canonical-career-r${current.revision}-${safeTimestamp(nowIso(now))}.json`;
      await copyFile(this.storePath, path.join(this.backupDirectory, backupName));
    }

    await this.writeCompatibility(artifacts, nextRevision);
    await atomicWrite(this.storePath, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  async verifyCompatibility(profile: CanonicalCareerProfile): Promise<boolean> {
    if (profile.compatibility.generatedFromRevision !== profile.revision) return false;
    try {
      const [profileMarkdown, ledgerMarkdown, manifestRaw] = await Promise.all([
        readFile(path.join(this.compatibilityDirectory, PROFILE_VIEW_FILE), "utf8"),
        readFile(path.join(this.compatibilityDirectory, LEDGER_VIEW_FILE), "utf8"),
        readFile(path.join(this.compatibilityDirectory, VIEW_MANIFEST_FILE), "utf8"),
      ]);
      const artifacts = renderCompatibilityArtifacts(profile);
      const manifest = JSON.parse(manifestRaw) as {
        revision?: number;
        profileSha256?: string;
        ledgerSha256?: string;
      };
      return (
        profileMarkdown === artifacts.profileMarkdown
        && ledgerMarkdown === artifacts.ledgerMarkdown
        && manifest.revision === profile.revision
        && manifest.profileSha256 === artifacts.profileSha256
        && manifest.ledgerSha256 === artifacts.ledgerSha256
      );
    } catch {
      return false;
    }
  }

  private async writeCompatibility(
    artifacts: CompatibilityArtifacts,
    revision: number,
  ): Promise<void> {
    await atomicWrite(
      path.join(this.compatibilityDirectory, PROFILE_VIEW_FILE),
      artifacts.profileMarkdown,
    );
    await atomicWrite(
      path.join(this.compatibilityDirectory, LEDGER_VIEW_FILE),
      artifacts.ledgerMarkdown,
    );
    await atomicWrite(
      path.join(this.compatibilityDirectory, VIEW_MANIFEST_FILE),
      `${JSON.stringify({
        revision,
        profileSha256: artifacts.profileSha256,
        ledgerSha256: artifacts.ledgerSha256,
      }, null, 2)}\n`,
    );
  }
}
