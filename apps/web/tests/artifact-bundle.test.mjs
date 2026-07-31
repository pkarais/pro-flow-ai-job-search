import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { unzipSync, strFromU8 } from "fflate";
import { buildApplicationArtifactBundle } from "../src/server/documents/artifact-bundle.ts";

test("application artifact bundles contain every manifest-listed file", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-bundle-"));
  const applicationId = "app_bundle_fixture";
  const directory = path.join(root, "applications", applicationId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "resume.docx"), "resume fixture");
  await writeFile(path.join(directory, "cover-letter.pdf"), "cover fixture");
  await writeFile(path.join(directory, "readiness.json"), JSON.stringify({
    schemaVersion: 2,
    applicationId,
    applicationRevision: 1,
    themeId: "modern",
    status: "blocked",
    artifacts: [
      { kind: "resume_docx", relativePath: "resume.docx", mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { kind: "cover_letter_pdf", relativePath: "cover-letter.pdf", mediaType: "application/pdf" },
    ],
    checks: [{ id: "visual_review", label: "Visual review", required: true, status: "pending", detail: "Review required." }],
    generatedAt: "2026-07-31T12:00:00.000Z",
  }));

  const bundle = await buildApplicationArtifactBundle(root, applicationId);
  const files = unzipSync(new Uint8Array(bundle.contents));
  assert.equal(strFromU8(files["documents/resume.docx"]), "resume fixture");
  assert.equal(strFromU8(files["documents/cover-letter.pdf"]), "cover fixture");
  assert.match(strFromU8(files["documents/readiness.json"]), /app_bundle_fixture/);
  assert.equal(bundle.artifactCount, 2);
});
