import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  evidenceImportResultSchema,
  type EvidenceImportResult,
  type EvidenceSourceDefinition,
  type ImportedFact,
  type ImportIssue,
} from "@pro-flow/career-core";

type ReadFailure = NodeJS.ErrnoException & { code?: string };

const verificationPattern =
  /\brequires verification\b|\bcurrent status\b.*\bverification\b|\bmust not be silently merged\b|\buncertain\b|\bnot independently verified\b/i;

const prohibitedUsePattern =
  /\bdo not claim\b|\bdo not invent\b|\bmust not appear\b|\bdo not imply\b|\buse cautiously\b/i;

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 60) || "section";
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .trim();
}

export function parseEvidenceMarkdown(
  source: EvidenceSourceDefinition,
  markdown: string,
): { facts: ImportedFact[]; issues: ImportIssue[] } {
  const facts: ImportedFact[] = [];
  const issues: ImportIssue[] = [];
  let section = source.label;
  let paragraph: string[] = [];
  let sequence = 0;

  const addFact = (raw: string) => {
    const value = stripInlineMarkdown(raw.replace(/^[-*]\s+/, ""));
    if (!value) return;
    sequence += 1;
    const conflicting = verificationPattern.test(value);
    facts.push({
      id: `${source.id}_${String(sequence).padStart(3, "0")}`,
      path: `${source.targetPath}.${slug(section)}.${sequence}`,
      value,
      sourceId: source.id,
      sourcePath: source.relativePath,
      sourceSection: section,
      status: conflicting ? "conflicting" : "needs_review",
      ...(conflicting
        ? { conflictNote: "The source explicitly marks this information as uncertain or requiring verification." }
        : {}),
    });

    if (conflicting) {
      issues.push({
        id: `${source.id}_verification_${sequence}`,
        severity: "warning",
        sourceId: source.id,
        message: `${source.label}: confirm an item explicitly marked for verification.`,
      });
    } else if (prohibitedUsePattern.test(value)) {
      issues.push({
        id: `${source.id}_restriction_${sequence}`,
        severity: "info",
        sourceId: source.id,
        message: `${source.label}: preserve a stated claim-usage restriction.`,
      });
    }
  };

  const flushParagraph = () => {
    if (paragraph.length) addFact(paragraph.join(" "));
    paragraph = [];
  };

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      section = stripInlineMarkdown(heading[1]);
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      addFact(trimmed);
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();

  return { facts, issues };
}

function safeSourcePath(root: string, relativePath: string): string {
  const resolvedRoot = path.resolve(root);
  const absolute = path.resolve(resolvedRoot, ...relativePath.split("/"));
  const relative = path.relative(resolvedRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Evidence source escapes the configured root: ${relativePath}`);
  }
  return absolute;
}

export async function importEvidencePreview(
  root: string,
  sources: readonly EvidenceSourceDefinition[],
  now = new Date(),
): Promise<EvidenceImportResult> {
  const facts: ImportedFact[] = [];
  const issues: ImportIssue[] = [];
  const summaries = [];

  for (const source of sources) {
    const absolute = safeSourcePath(root, source.relativePath);
    try {
      const contents = await readFile(absolute, "utf8");
      if (!contents.trim()) {
        summaries.push({ ...source, status: "empty" as const, factCount: 0 });
        issues.push({
          id: `${source.id}_empty`,
          severity: "blocking",
          sourceId: source.id,
          message: `${source.label} is empty and cannot provide evidence.`,
        });
        continue;
      }
      const parsed = parseEvidenceMarkdown(source, contents);
      facts.push(...parsed.facts);
      issues.push(...parsed.issues);
      summaries.push({
        ...source,
        status: "loaded" as const,
        factCount: parsed.facts.length,
      });
    } catch (error) {
      const failure = error as ReadFailure;
      const missing = failure.code === "ENOENT";
      summaries.push({
        ...source,
        status: missing ? "missing" as const : "unreadable" as const,
        factCount: 0,
      });
      issues.push({
        id: `${source.id}_${missing ? "missing" : "unreadable"}`,
        severity: "blocking",
        sourceId: source.id,
        message: missing
          ? `${source.label} is missing from the configured source.`
          : `${source.label} could not be read.`,
      });
    }
  }

  return evidenceImportResultSchema.parse({
    importedAt: now.toISOString(),
    sourceCount: sources.length,
    loadedSourceCount: summaries.filter((source) => source.status === "loaded").length,
    sources: summaries,
    facts,
    issues,
    readOnly: true,
  });
}
