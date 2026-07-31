import { readFile } from "node:fs/promises";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { DocumentService } from "./document-service.ts";

function safeArchiveName(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "application-documents";
}

export async function buildApplicationArtifactBundle(dataRoot: string, applicationId: string) {
  const readiness = await new DocumentService(dataRoot).load(applicationId);
  if (!readiness || readiness.artifacts.length === 0) {
    throw new Error("No generated application artifacts are available.");
  }

  const directory = path.resolve(dataRoot, "applications", applicationId);
  const entries: Record<string, Uint8Array> = {};
  for (const artifact of readiness.artifacts) {
    if (artifact.relativePath !== path.basename(artifact.relativePath)) {
      throw new Error("The artifact manifest contains an unsafe path.");
    }
    const target = path.resolve(directory, artifact.relativePath);
    if (path.dirname(target) !== directory) {
      throw new Error("The artifact manifest escapes its application archive.");
    }
    entries[artifact.relativePath] = new Uint8Array(await readFile(target));
  }

  entries["readiness.json"] = strToU8(`${JSON.stringify(readiness, null, 2)}\n`);
  return {
    contents: Buffer.from(zipSync(entries, { level: 6 })),
    filename: `${safeArchiveName(applicationId)}-documents.zip`,
    artifactCount: readiness.artifacts.length,
  };
}
