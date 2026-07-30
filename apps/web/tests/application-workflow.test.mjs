import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { canonicalCareerProfileSchema } from "../../../packages/career-core/dist/index.js";
import { buildApplication } from "../src/server/applications/application-service.ts";
import { ApplicationStore } from "../src/server/applications/application-store.ts";

const timestamp = "2026-01-02T03:04:05.000Z";
const profile = canonicalCareerProfileSchema.parse({
  schemaVersion: 1,
  candidateId: "fixture_candidate",
  revision: 3,
  sourceImportedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  compatibility: { generatedFromRevision: 3, profileSha256: "a".repeat(64), ledgerSha256: "b".repeat(64) },
  records: [{
    id: "evidence_strategy",
    sourceId: "fixture_source",
    sourcePath: "fixtures/profile.md",
    sourceSection: "Experience",
    path: "experience.strategy",
    value: "Led product strategy and analytics delivery for cross-functional teams.",
    status: "needs_review",
    decision: "confirmed",
    decidedAt: timestamp,
  }, {
    id: "policy_prohibited",
    sourceId: "fixture_policy",
    sourcePath: "fixtures/policy.md",
    sourceSection: "Restrictions",
    path: "prohibitedClaims.1",
    value: "Never claim unsupported revenue outcomes.",
    status: "needs_review",
    decision: "confirmed",
    decidedAt: timestamp,
  }],
});

const intake = {
  companyName: "Example Company",
  positionTitle: "Product Strategy Lead",
  location: "Remote",
  description: "We are seeking a product strategy leader to guide analytics delivery, coordinate cross-functional teams, define priorities, communicate decisions, and build measurable operating plans.",
};

test("application workflow uses only reviewed evidence and preserves visible gaps", () => {
  const application = buildApplication(intake, profile, new Date(timestamp));
  assert.equal(application.profileRevision, 3);
  assert.equal(application.status, "factual_review");
  assert.deepEqual(application.draft.claims[0].evidenceIds, ["evidence_strategy"]);
  assert.match(application.draft.summary, /Led product strategy/);
  assert.doesNotMatch(application.draft.summary, /revenue outcomes/);
  assert.ok(application.draft.gaps.length > 0);
});

test("application workflow refuses an unreviewed profile", () => {
  const pending = canonicalCareerProfileSchema.parse({
    ...profile,
    records: profile.records.map((record) => ({ ...record, decision: "pending", decidedAt: undefined })),
  });
  assert.throws(() => buildApplication(intake, pending), /Confirm or correct/);
});

test("archive persists claim decisions and completes only after review", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-app-"));
  const store = new ApplicationStore(root);
  const application = buildApplication(intake, profile, new Date(timestamp));
  await store.saveNew(application);
  const updated = await store.decide({
    applicationId: application.id,
    claimId: application.draft.claims[0].id,
    expectedRevision: 1,
    decision: "verified",
  }, new Date("2026-01-02T04:00:00.000Z"));
  assert.equal(updated.status, "review_complete");
  assert.equal(updated.revision, 2);
  const raw = await readFile(path.join(root, "applications", `${application.id}.json`), "utf8");
  assert.equal(JSON.parse(raw).draft.claims[0].decision, "verified");
  await assert.rejects(() => store.decide({
    applicationId: application.id,
    claimId: application.draft.claims[0].id,
    expectedRevision: 1,
    decision: "verified",
  }), /revision 2/i);
});
