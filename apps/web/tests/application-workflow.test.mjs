import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  canonicalCareerProfileSchema,
  documentReadinessSchema,
} from "../../../packages/career-core/dist/index.js";
import { buildApplication } from "../src/server/applications/application-service.ts";
import { ApplicationStore } from "../src/server/applications/application-store.ts";
import { DocumentService, renderDocumentSources } from "../src/server/documents/document-service.ts";
import { OperationsStore } from "../src/server/operations/operations-store.ts";
import {
  buildOfficialSearchUrl,
  buildOfficialSearchUrls,
  inspectPortalRuntime,
  normalizeUsLocation,
} from "../src/server/operations/portal-adapter.ts";
import { deriveSearchDefaults } from "../src/server/operations/search-defaults.ts";
import {
  createInterviewPack,
  recordOutcome,
  recordSearchRun,
  transitionPipeline,
} from "../src/server/operations/operations-service.ts";

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

test("document sources contain only verified claims and escape untrusted text", () => {
  const application = buildApplication({ ...intake, companyName: "Example & Company" }, profile, new Date(timestamp));
  const reviewed = {
    ...application,
    status: "review_complete",
    draft: {
      ...application.draft,
      claims: application.draft.claims.map((claim) => ({ ...claim, decision: "verified", reviewedAt: timestamp })),
    },
  };
  const sources = renderDocumentSources(reviewed, {
    fullName: "Alex Example",
    email: "alex@example.test",
    phone: "+1 555 0100",
  });
  assert.match(sources.cv, /Example \\& Company/);
  assert.match(sources.cv, /alex@example\.test/);
  assert.doesNotMatch(sources.cv, /policy_prohibited/);
});

test("readiness cannot be marked ready while a required check is incomplete", () => {
  assert.throws(() => documentReadinessSchema.parse({
    schemaVersion: 1,
    applicationId: "app_fixture",
    applicationRevision: 1,
    status: "ready",
    artifacts: [],
    checks: [{ id: "pdf", label: "PDF check", required: true, status: "failed" }],
    generatedAt: timestamp,
  }), /Ready requires every mandatory check/);
});

test("document generation fails closed when required local tools are unavailable", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-documents-"));
  const application = buildApplication(intake, profile, new Date(timestamp));
  const reviewed = {
    ...application,
    status: "review_complete",
    draft: {
      ...application.draft,
      claims: application.draft.claims.map((claim) => ({ ...claim, decision: "verified", reviewedAt: timestamp })),
    },
  };
  const readiness = await new DocumentService(root).generate(reviewed, {
    fullName: "Alex Example",
    email: "alex@example.test",
    phone: "+1 555 0100",
  }, new Date(timestamp));
  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.checks.find((item) => item.id === "document_tools").status, "failed");
  assert.ok(readiness.artifacts.some((artifact) => artifact.kind === "cv_source"));
  assert.ok(readiness.checks.every((item) => item.status !== "passed" || item.id !== "cv_pages"));
  await assert.rejects(
    () => new DocumentService(root).confirmVisualReview(application.id, application.revision),
    /Both PDFs must exist/,
  );
});

test("every search adapter targets an allowlisted U.S. hiring portal", () => {
  const portals = {
    "linkedin-search": "www.linkedin.com",
    "indeed-search": "www.indeed.com",
    "usajobs-search": "www.usajobs.gov",
    "dice-search": "www.dice.com",
    "builtin-search": "builtin.com",
    "wellfound-search": "wellfound.com",
  };
  for (const [portal, hostname] of Object.entries(portals)) {
    const url = new URL(buildOfficialSearchUrl({
      portal,
      query: "program manager",
      location: "United States",
      limit: 10,
    }));
    assert.equal(url.hostname, hostname);
    assert.doesNotMatch(url.href, /jobbank|jobnet|jobindex|jobdanmark|freehire/i);
  }
});

test("runtime diagnostics expose only the six U.S. official searches", () => {
  const report = inspectPortalRuntime(new Date(timestamp));
  assert.equal(report.portals.length, 6);
  assert.ok(report.portals.every((portal) => portal.status === "ready"));
  assert.ok(report.portals.every((portal) => portal.searchMode === "official_search"));
});

test("portal groups launch the requested pair or all six without duplicates", () => {
  const request = { query: "program manager", location: "United States" };
  assert.deepEqual(
    buildOfficialSearchUrls({ ...request, group: "linkedin_indeed" }).map((item) => item.portal),
    ["linkedin-search", "indeed-search"],
  );
  assert.deepEqual(
    buildOfficialSearchUrls({ ...request, group: "usajobs_builtin" }).map((item) => item.portal),
    ["usajobs-search", "builtin-search"],
  );
  assert.deepEqual(
    buildOfficialSearchUrls({ ...request, group: "wellfound_dice" }).map((item) => item.portal),
    ["wellfound-search", "dice-search"],
  );
  const all = buildOfficialSearchUrls({ ...request, group: "all" });
  assert.equal(all.length, 6);
  assert.equal(new Set(all.map((item) => item.portal)).size, 6);
  assert.equal(normalizeUsLocation("Austin, TX"), "Austin, TX, United States");
  assert.equal(normalizeUsLocation("United States"), "United States");
});

test("search defaults derive roles from career evidence and keep location in the U.S.", () => {
  const searchProfile = canonicalCareerProfileSchema.parse({
    ...profile,
    records: [...profile.records, {
      id: "target_role",
      sourceId: "professional_genome",
      sourcePath: "fixtures/profile.md",
      sourceSection: "Target roles",
      path: "searchPreferences.coreRoles.0",
      value: "Senior Program Manager",
      status: "needs_review",
      decision: "confirmed",
      decidedAt: timestamp,
    }],
  });
  const defaults = deriveSearchDefaults(searchProfile, undefined, ["Operations Director"]);
  assert.deepEqual(defaults.roles, ["Operations Director", "Senior Program Manager"]);
  assert.deepEqual(defaults.locations, ["United States"]);
  assert.equal(defaults.source, "reviewed_profile");
});

test("successful grouped searches persist private reusable role and location choices", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-search-history-"));
  const state = await recordSearchRun(root, {
    group: "linkedin_indeed",
    query: "Operations Director",
    location: "Austin, TX, United States",
  }, new Date(timestamp));
  assert.equal(state.searches.length, 1);
  assert.deepEqual(state.searches[0].portals, ["linkedin-search", "indeed-search"]);
  const defaults = deriveSearchDefaults(null, undefined, [state.searches[0].query], [state.searches[0].location]);
  assert.equal(defaults.roles[0], "Operations Director");
  assert.equal(defaults.locations[0], "Austin, TX, United States");
});

test("legacy operations migration removes non-U.S. portal jobs but keeps LinkedIn history", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-us-migration-"));
  const job = {
    id: "job_fixture",
    externalId: "fixture",
    title: "Program Manager",
    company: "Fixture Company",
    location: "Remote",
    url: "https://example.test/job",
    score: 50,
    matchedTerms: [],
    gaps: [],
    firstSeenAt: timestamp,
  };
  await writeFile(path.join(root, "operations.json"), JSON.stringify({
    schemaVersion: 1,
    revision: 2,
    jobs: [
      { ...job, portal: "linkedin-search" },
      { ...job, id: "job_legacy", portal: "jobnet-search" },
    ],
    pipeline: [],
    interviews: [],
    outcomes: [],
    updatedAt: timestamp,
  }));
  const migrated = await new OperationsStore(root).load();
  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(migrated.jobs.map((item) => item.portal), ["linkedin-search"]);
  assert.deepEqual(migrated.searches, []);
});

test("pipeline rejects unsafe skips and readiness bypasses", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-pipeline-"));
  const application = buildApplication(intake, profile, new Date(timestamp));
  await new ApplicationStore(root).saveNew(application);
  await assert.rejects(() => transitionPipeline(root, {
    applicationId: application.id,
    expectedRevision: 0,
    to: "applied",
  }), /Unsafe transition/);
  const drafting = await transitionPipeline(root, {
    applicationId: application.id,
    expectedRevision: 0,
    to: "drafting",
  });
  assert.equal(drafting.pipeline[0].status, "drafting");
  assert.equal(drafting.pipeline[0].events.length, 1);
});

test("interview packs stay consistent with verified claims and outcomes append", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-operations-"));
  const application = buildApplication(intake, profile, new Date(timestamp));
  const reviewed = {
    ...application,
    status: "review_complete",
    draft: {
      ...application.draft,
      claims: application.draft.claims.map((claim) => ({ ...claim, decision: "verified", reviewedAt: timestamp })),
    },
  };
  await new ApplicationStore(root).saveNew(reviewed);
  const withInterview = await createInterviewPack(root, {
    applicationId: reviewed.id,
    stage: "technical",
  });
  assert.deepEqual(withInterview.interviews[0].consistencyClaims, reviewed.draft.claims.map((claim) => claim.text));
  const withOutcome = await recordOutcome(root, {
    applicationId: reviewed.id,
    status: "in_progress",
    note: "Technical interview scheduled.",
  });
  const final = await recordOutcome(root, {
    applicationId: reviewed.id,
    status: "rejected",
    note: "Employer selected a candidate with deeper domain experience.",
  });
  assert.equal(withOutcome.outcomes.length, 1);
  assert.equal(final.outcomes.length, 2);
  assert.equal((await new OperationsStore(root).load()).outcomes[0].note, "Technical interview scheduled.");
});
