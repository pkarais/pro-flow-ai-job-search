import { createHash } from "node:crypto";
import {
  effectiveEvidenceValue,
  type CanonicalCareerProfile,
  type CanonicalEvidenceRecord,
} from "@pro-flow/career-core";

export type CompatibilityArtifacts = {
  profileMarkdown: string;
  ledgerMarkdown: string;
  profileSha256: string;
  ledgerSha256: string;
};

function sha256(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

function titleFromPath(path: string): string {
  const root = path.split(".")[0] || "evidence";
  return root
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function groupAcceptedRecords(records: CanonicalEvidenceRecord[]) {
  const groups = new Map<string, CanonicalEvidenceRecord[]>();
  for (const record of records) {
    if (!effectiveEvidenceValue(record)) continue;
    const group = titleFromPath(record.path);
    groups.set(group, [...(groups.get(group) ?? []), record]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

export function renderCompatibilityArtifacts(
  profile: CanonicalCareerProfile,
): CompatibilityArtifacts {
  const groups = groupAcceptedRecords(profile.records);
  const profileSections = groups.map(([heading, records]) => {
    const items = records.map((record) => {
      const value = effectiveEvidenceValue(record);
      return `- ${value}`;
    });
    return `## ${heading}\n\n${items.join("\n")}`;
  });

  const profileMarkdown = [
    "# Pro-Flow Canonical Career Profile",
    "",
    `<!-- Generated from canonical revision ${profile.revision}. Do not edit directly. -->`,
    "",
    profileSections.join("\n\n") || "_No confirmed evidence yet._",
    "",
  ].join("\n");

  const ledgerRows = [...profile.records]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((record) => {
      const effective = effectiveEvidenceValue(record);
      return [
        `## ${record.id}`,
        "",
        `- Decision: ${record.decision}`,
        `- Source: ${record.sourcePath}`,
        `- Target: ${record.path}`,
        `- Original: ${record.value}`,
        ...(effective && effective !== record.value ? [`- Effective: ${effective}`] : []),
        ...(record.decisionNote ? [`- Note: ${record.decisionNote}`] : []),
      ].join("\n");
    });

  const ledgerMarkdown = [
    "# Pro-Flow Evidence Decision Ledger",
    "",
    `<!-- Generated from canonical revision ${profile.revision}. Do not edit directly. -->`,
    "",
    ...ledgerRows,
    "",
  ].join("\n");

  return {
    profileMarkdown,
    ledgerMarkdown,
    profileSha256: sha256(profileMarkdown),
    ledgerSha256: sha256(ledgerMarkdown),
  };
}
