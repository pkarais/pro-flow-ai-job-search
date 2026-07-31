import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { importEvidencePreview, parseEvidenceMarkdown } from "../src/server/evidence/importer.ts";

const source = {
  id: "fixture_history",
  relativePath: "career_os/knowledge/history.md",
  label: "Career history",
  kind: "knowledge",
  targetPath: "careerHistory",
};

test("Markdown facts retain source path and section provenance", () => {
  const parsed = parseEvidenceMarkdown(
    source,
    "# History\n\n## Current role\n\n- Leads operations.\n- Credential REQUIRES VERIFICATION.",
  );
  assert.equal(parsed.facts.length, 2);
  assert.equal(parsed.facts[0].sourcePath, source.relativePath);
  assert.equal(parsed.facts[0].sourceSection, "Current role");
  assert.equal(parsed.facts[1].status, "conflicting");
  assert.equal(parsed.issues[0].severity, "warning");
});

test("the importer reports missing and empty allowlisted sources", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-import-"));
  const emptySource = { ...source, id: "empty", relativePath: "career_os/knowledge/empty.md" };
  const missingSource = { ...source, id: "missing", relativePath: "career_os/knowledge/missing.md" };
  await mkdir(path.join(root, "career_os", "knowledge"), { recursive: true });
  await writeFile(path.join(root, ...emptySource.relativePath.split("/")), "", "utf8");

  const result = await importEvidencePreview(
    root,
    [emptySource, missingSource],
    new Date("2026-07-30T16:00:00Z"),
  );

  assert.deepEqual(result.sources.map((item) => item.status), ["empty", "missing"]);
  assert.equal(result.issues.filter((item) => item.severity === "blocking").length, 2);
  assert.equal(result.readOnly, true);
});

test("the importer rejects a source path outside the configured root", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-boundary-"));
  await assert.rejects(
    importEvidencePreview(root, [{ ...source, relativePath: "../private.md" }]),
    /escapes the configured root/,
  );
});

test("claim-usage restrictions are preserved as informational issues", () => {
  const parsed = parseEvidenceMarkdown(source, "# Rules\n\nDo not claim unsupported outcomes.");
  assert.equal(parsed.issues[0].severity, "info");
});
