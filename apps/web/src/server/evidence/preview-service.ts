import "server-only";

import type { EvidenceImportResult } from "@pro-flow/career-core";
import { importEvidencePreview } from "./importer";
import { executiveEvidenceSources } from "./source-manifest";

export type EvidencePreviewState =
  | { status: "not_configured" }
  | { status: "ready"; result: EvidenceImportResult }
  | { status: "error"; message: string };

export async function loadExecutiveEvidencePreview(): Promise<EvidencePreviewState> {
  const root = process.env.EXECUTIVE_CAREER_OS_PATH?.trim();
  if (!root) return { status: "not_configured" };

  try {
    return {
      status: "ready",
      result: await importEvidencePreview(root, executiveEvidenceSources),
    };
  } catch {
    return {
      status: "error",
      message: "The evidence preview could not be created. Check the configured local source path.",
    };
  }
}
