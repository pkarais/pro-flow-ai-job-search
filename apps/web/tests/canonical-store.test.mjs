import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CanonicalProfileStore,
  RevisionConflictError,
  createCanonicalProfile,
  migrateCanonicalProfile,
} from "../src/server/canonical/canonical-store.ts";
import { renderCompatibilityArtifacts } from "../src/server/canonical/compatibility-renderer.ts";

const imported = {
  importedAt: "2026-07-30T16:00:00.000Z",
  sourceCount: 1,
  loadedSourceCount: 1,
  sources: [{
    id: "fixture_source",
    relativePath: "fixtures/profile.md",
    label: "Fixture profile",
    kind: "knowledge",
    targetPath: "skills",
    status: "loaded",
    factCount: 1,
  }],
  facts: [{
    id: "fixture_source_001",
    path: "skills.example.1",
    value: "Operations leadership",
    sourceId: "fixture_source",
    sourcePath: "fixtures/profile.md",
    sourceSection: "Skills",
    status: "needs_review",
  }],
  issues: [],
  readOnly: true,
};

test("canonical storage round-trips without data loss and backs up revisions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-canonical-"));
  const repository = new CanonicalProfileStore(root);
  const initial = createCanonicalProfile(imported, new Date("2026-07-30T16:00:00Z"));
  const first = await repository.save(initial, 0, new Date("2026-07-30T16:01:00Z"));
  const loaded = await repository.load();
  assert.deepEqual(loaded, first);
  assert.equal(await repository.verifyCompatibility(first), true);

  const reviewed = {
    ...first,
    records: first.records.map((record) => ({
      ...record,
      decision: "confirmed",
      decidedAt: "2026-07-30T16:02:00.000Z",
    })),
  };
  const second = await repository.save(reviewed, 1, new Date("2026-07-30T16:02:00Z"));
  assert.equal(second.revision, 2);
  assert.equal(second.records[0].decision, "confirmed");
  assert.equal(await repository.verifyCompatibility(second), true);

  const backups = await readdir(path.join(root, "backups"));
  assert.equal(backups.length, 1);
  const backup = JSON.parse(await readFile(path.join(root, "backups", backups[0]), "utf8"));
  assert.equal(backup.revision, 1);
});

test("compatibility rendering is deterministic", () => {
  const profile = createCanonicalProfile(imported, new Date("2026-07-30T16:00:00Z"));
  const reviewed = {
    ...profile,
    records: profile.records.map((record) => ({
      ...record,
      decision: "corrected",
      correctedValue: "Operational leadership",
      decidedAt: "2026-07-30T16:02:00.000Z",
    })),
  };
  assert.deepEqual(
    renderCompatibilityArtifacts(reviewed),
    renderCompatibilityArtifacts(structuredClone(reviewed)),
  );
});

test("stale writes are rejected", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-revision-"));
  const repository = new CanonicalProfileStore(root);
  const initial = createCanonicalProfile(imported);
  await repository.save(initial, 0);
  await assert.rejects(
    repository.save(initial, 0),
    (error) => error instanceof RevisionConflictError && error.currentRevision === 1,
  );
});

test("future schema versions fail safely", () => {
  assert.throws(
    () => migrateCanonicalProfile({ schemaVersion: 99 }),
    /Unsupported canonical profile schema version/,
  );
});

test("legacy schema zero migrates to pending version one", () => {
  const migrated = migrateCanonicalProfile({
    schemaVersion: 0,
    candidateId: "fixture_candidate",
    revision: 1,
    sourceImportedAt: imported.importedAt,
    createdAt: imported.importedAt,
    updatedAt: imported.importedAt,
    records: imported.facts,
  });
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.records[0].decision, "pending");
});
