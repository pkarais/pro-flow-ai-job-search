import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  canonicalCareerProfileSchema,
  documentReadinessSchema,
  documentThemes,
  recommendDocumentTheme,
} from "../../../packages/career-core/dist/index.js";
import { applyAiWriting, buildApplication } from "../src/server/applications/application-service.ts";
import { ApplicationStore } from "../src/server/applications/application-store.ts";
import {
  applicationWritingSchema,
  assertRejectedLanguageAbsent,
  validateApplicationWriting,
  validateInterviewWriting,
} from "../src/server/ai/grounded-writing-service.ts";
import { zodTextFormat } from "openai/helpers/zod";
import { DocumentService, renderDocumentSources } from "../src/server/documents/document-service.ts";
import { tailoredCompetencies, verifiedMetricCallouts } from "../src/server/documents/structured-resume-service.ts";
import { OperationsStore } from "../src/server/operations/operations-store.ts";
import {
  buildOfficialSearchUrl,
  buildOfficialSearchUrls,
  inspectPortalRuntime,
  normalizeUsLocation,
} from "../src/server/operations/portal-adapter.ts";
import { deriveSearchDefaults } from "../src/server/operations/search-defaults.ts";
import { parseUsAiMarketInsight } from "../src/server/operations/market-insights.ts";
import {
  createInterviewPack,
  currentApplications,
  deleteJob,
  importJob,
  listApplicationArchives,
  permanentlyDeleteApplication,
  recordOutcome,
  recordSearchRun,
  restoreApplication,
  saveCompanyInsight,
  transitionPipeline,
} from "../src/server/operations/operations-service.ts";

const timestamp = "2026-01-02T03:04:05.000Z";
const visualDirection = {
  palette: "navy",
  density: "balanced",
  motif: "line",
  icons: true,
  iconSet: "professional",
  iconTreatment: "outline",
  rationale: "Restrained professional presentation for the target role.",
};

test("Indeed Hiring Lab AI market data accepts its published share column", () => {
  const insight = parseUsAiMarketInsight([
    "date,jobcountry,AI_share_postings",
    "2026-01-01,US,2.10",
    "2026-01-02,CA,1.20",
    "2026-01-02,US,2.25",
  ].join("\n"));
  assert.deepEqual(insight, {
    date: "2026-01-02",
    share: 2.25,
    previousShare: 2.1,
    trend: "rising",
  });
});

test("operations shows only the newest application archive for the same posting", () => {
  const older = buildApplication(intake, profile, new Date("2026-01-02T03:04:05.000Z"));
  const newer = buildApplication(intake, profile, new Date("2026-01-03T03:04:05.000Z"));
  const distinct = buildApplication({ ...intake, positionTitle: "Facilities Director" }, profile, new Date("2026-01-01T03:04:05.000Z"));
  const visible = currentApplications([older, distinct, newer]);
  assert.equal(visible.length, 2);
  assert.equal(visible[0].id, newer.id);
  assert.ok(visible.some((application) => application.id === distinct.id));
  assert.ok(!visible.some((application) => application.id === older.id));
});
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
  assert.match(application.draft.summary, /supports relevant experience in product, strategy/);
  assert.doesNotMatch(application.draft.summary, /Led product strategy and analytics delivery for cross-functional teams\./);
  assert.doesNotMatch(application.draft.summary, /revenue outcomes/);
  assert.ok(application.draft.gaps.length > 0);
});

test("cover-letter draft is employer-facing prose rather than raw evidence or policy notes", () => {
  const noisyProfile = canonicalCareerProfileSchema.parse({
    ...profile,
    records: [{
      ...profile.records[0],
      value: "His career includes product strategy and analytics delivery. Do not claim independently verified business results.",
    }],
  });
  const application = buildApplication(intake, noisyProfile, new Date(timestamp));
  assert.match(application.draft.coverLetter, /^Dear Hiring Manager,/);
  assert.match(application.draft.coverLetter, /I am writing to express my interest/);
  assert.match(application.draft.coverLetter, /Sincerely,\n\n\[Your name\]$/);
  assert.doesNotMatch(application.draft.coverLetter, /His career/);
  assert.doesNotMatch(application.draft.coverLetter, /Do not claim/);
  assert.doesNotMatch(application.draft.coverLetter, /explicit gaps/i);
});

test("AI application writing remains evidence-linked while allowing persuasive prose", () => {
  const baseline = buildApplication(intake, profile, new Date(timestamp));
  const application = applyAiWriting(baseline, {
    method: "ai",
    model: "fixture-writing-model",
    value: {
      visualDirection,
      positioningSummary: {
        text: "Operations-minded product strategist who turns complex priorities into clear, coordinated delivery.",
        evidenceIds: ["evidence_strategy"],
      },
      resumeBullets: [
        { text: "Led product strategy across cross-functional teams to align priorities and delivery.", evidenceIds: ["evidence_strategy"] },
        { text: "Connected analytics work with practical operating decisions and stakeholder needs.", evidenceIds: ["evidence_strategy"] },
        { text: "Guided collaborative delivery through clear direction and accountable coordination.", evidenceIds: ["evidence_strategy"] },
      ],
      coverLetter: {
        opening: "I am drawn to this opportunity because it brings strategic thinking and practical execution together.",
        bodyParagraphs: [
          { text: "My background leading product strategy and analytics delivery has taught me how to turn competing priorities into coordinated action.", evidenceIds: ["evidence_strategy"] },
          { text: "I would bring that same clarity and cross-functional focus to the challenges this team is ready to solve.", evidenceIds: ["evidence_strategy"] },
        ],
        closing: "I would welcome a conversation about the perspective and disciplined execution I could bring to the role.",
      },
    },
  });
  assert.equal(application.draft.generation.method, "ai");
  assert.equal(application.draft.generation.model, "fixture-writing-model");
  assert.ok(application.draft.claims.some((claim) => claim.kind === "cover_letter"));
  assert.ok(application.draft.claims.every((claim) => claim.evidenceIds.includes("evidence_strategy")));
  assert.doesNotMatch(application.draft.coverLetter, /evidence_strategy|confirmed evidence/i);
});

test("AI validators reject unknown citations and internal policy leakage", () => {
  const writing = {
    visualDirection,
    positioningSummary: { text: "A grounded leader who coordinates complex cross-functional delivery.", evidenceIds: ["evidence_strategy"] },
    resumeBullets: [
      { text: "Led product strategy and analytics delivery across collaborating teams.", evidenceIds: ["evidence_strategy"] },
      { text: "Aligned priorities and operating decisions across cross-functional stakeholders.", evidenceIds: ["evidence_strategy"] },
      { text: "Turned complex delivery needs into clear plans and accountable execution.", evidenceIds: ["evidence_strategy"] },
    ],
    coverLetter: {
      opening: "I am drawn to the opportunity to connect strategic thinking with practical delivery.",
      bodyParagraphs: [
        { text: "My confirmed evidence shows product strategy leadership across teams.", evidenceIds: ["evidence_strategy"] },
        { text: "I bring a collaborative approach to analytics delivery and operating priorities.", evidenceIds: ["evidence_strategy"] },
      ],
      closing: "I would welcome a conversation about the contribution I could make.",
    },
  };
  assert.throws(
    () => validateApplicationWriting(writing, ["evidence_strategy"]),
    /internal evidence or policy language/,
  );
  assert.throws(
    () => validateInterviewWriting({
      likelyQuestions: ["Why this role?", "Why this company?", "How do you lead?", "How do you prioritize?", "How do you learn?"],
      bridgeAnswers: [{ text: "I would connect the gap to adjacent, verified work.", evidenceIds: ["invented_evidence"] }],
      questionsToAsk: ["What defines success?", "What challenge matters most?", "How is the team structured?", "How are priorities set?"],
    }, ["evidence_strategy"]),
    /not supplied/,
  );
});

test("AI application structured-output schema marks visual direction as required", () => {
  const format = zodTextFormat(applicationWritingSchema, "grounded_application_writing");
  assert.ok(format.schema.required.includes("visualDirection"));
});

test("regenerated AI writing cannot repeat rejected claim language", () => {
  const writing = {
    visualDirection,
    positioningSummary: { text: "A grounded leader who coordinates complex cross-functional delivery.", evidenceIds: ["evidence_strategy"] },
    resumeBullets: [
      { text: "Led product strategy and analytics delivery across collaborating teams.", evidenceIds: ["evidence_strategy"] },
      { text: "Aligned priorities and operating decisions across cross-functional stakeholders.", evidenceIds: ["evidence_strategy"] },
      { text: "Turned complex delivery needs into clear plans and accountable execution.", evidenceIds: ["evidence_strategy"] },
    ],
    coverLetter: {
      opening: "I am drawn to the opportunity to connect strategic thinking with practical delivery.",
      bodyParagraphs: [
        { text: "My background supports focused product strategy and coordinated execution.", evidenceIds: ["evidence_strategy"] },
        { text: "I bring a collaborative approach to analytics delivery and operating priorities.", evidenceIds: ["evidence_strategy"] },
      ],
      closing: "I would welcome a conversation about the contribution I could make.",
    },
  };
  assert.throws(
    () => assertRejectedLanguageAbsent(writing, ["Led product strategy and analytics delivery across collaborating teams."]),
    /repeated language/,
  );
  assert.doesNotThrow(() => assertRejectedLanguageAbsent(writing, ["A claim that does not appear."]));
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

test("draft regeneration archives rejected decisions and resets replacement claims", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-regenerate-"));
  const store = new ApplicationStore(root);
  const application = buildApplication(intake, profile, new Date(timestamp));
  await store.saveNew(application);
  const rejected = await store.decide({
    applicationId: application.id,
    claimId: application.draft.claims[0].id,
    expectedRevision: 1,
    decision: "do_not_use",
  }, new Date("2026-01-02T04:00:00.000Z"));
  const replacement = {
    ...rejected.draft,
    claims: rejected.draft.claims.map((claim, index) => ({
      ...claim,
      id: `${claim.id}_replacement_${index}`,
      text: `${claim.text} replacement`,
      decision: "pending",
      reviewedAt: undefined,
    })),
  };
  const regenerated = await store.replaceDraft({
    applicationId: application.id,
    expectedRevision: rejected.revision,
  }, replacement, new Date("2026-01-02T05:00:00.000Z"));
  assert.equal(regenerated.revision, 3);
  assert.equal(regenerated.status, "factual_review");
  assert.ok(regenerated.draft.claims.every((claim) => claim.decision === "pending"));
  assert.equal(regenerated.draftHistory.length, 1);
  assert.equal(regenerated.draftHistory[0].draft.claims[0].decision, "do_not_use");
  await assert.rejects(
    () => store.replaceDraft({
      applicationId: application.id,
      expectedRevision: rejected.revision,
    }, replacement),
    /revision 3/i,
  );
});

test("draft regeneration preserves approval for the same section and evidence basis", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-regenerate-approved-"));
  const store = new ApplicationStore(root);
  const application = buildApplication(intake, profile, new Date(timestamp));
  await store.saveNew(application);
  let reviewed = application;
  for (const claim of application.draft.claims) {
    reviewed = await store.decide({ applicationId: application.id, claimId: claim.id, expectedRevision: reviewed.revision, decision: "verified" });
  }
  const replacement = {
    ...reviewed.draft,
    claims: reviewed.draft.claims.map((claim, index) => ({ ...claim, id: `${claim.id}_polished_${index}`, text: `${claim.text} Polished.`, decision: "verified" })),
  };
  const regenerated = await store.replaceDraft({ applicationId: application.id, expectedRevision: reviewed.revision }, replacement);
  assert.equal(regenerated.status, "review_complete");
  assert.ok(regenerated.draft.claims.every((claim) => claim.decision === "verified"));
});

test("saved draft versions can be restored and deliberately deleted", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-draft-versions-"));
  const store = new ApplicationStore(root);
  const application = buildApplication(intake, profile, new Date(timestamp));
  await store.saveNew(application);
  const replacement = {
    ...application.draft,
    summary: "A deliberately different tailored summary.",
    claims: application.draft.claims.map((claim, index) => ({ ...claim, id: `${claim.id}_v2_${index}`, decision: "pending" })),
  };
  const regenerated = await store.replaceDraft({ applicationId: application.id, expectedRevision: 1 }, replacement);
  const restored = await store.restoreDraftVersion(application.id, regenerated.revision, 1);
  assert.equal(restored.draft.summary, application.draft.summary);
  assert.ok(restored.draftHistory.some((entry) => entry.draft.summary === replacement.summary));
  const disposable = restored.draftHistory.find((entry) => entry.draft.summary === replacement.summary);
  const cleaned = await store.deleteDraftVersion(application.id, restored.revision, disposable.revision);
  assert.ok(!cleaned.draftHistory.some((entry) => entry.revision === disposable.revision));
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
  assert.match(sources.cv, /alex@example\.test/);
  assert.doesNotMatch(sources.cv, /job post/i);
  assert.doesNotMatch(sources.cv, /policy_prohibited/);
  assert.equal((sources.cover.match(/Dear Hiring Manager/g) ?? []).length, 1);
  assert.match(sources.cover, /Alex Example/);
  assert.doesNotMatch(sources.cover, /\[Your name\]/);
  assert.doesNotMatch(sources.cv, /Keyword alignment|Visible gaps|Evidence-grounded detail/);
  const firstResumeClaim = reviewed.draft.claims.find((claim) => !claim.kind || claim.kind === "resume_bullet").text;
  assert.equal(sources.cv.split(firstResumeClaim).length - 1, 1);
});

test("document sources use confirmed career context instead of résumé padding", () => {
  const application = buildApplication(intake, profile, new Date(timestamp));
  const reviewed = {
    ...application,
    status: "review_complete",
    draft: {
      ...application.draft,
      claims: application.draft.claims.map((claim) => ({ ...claim, decision: "verified", reviewedAt: timestamp })),
    },
  };
  const careerProfile = canonicalCareerProfileSchema.parse({
    ...profile,
    records: [
      ...profile.records,
      {
        id: "verified_career_history_001",
        sourceId: "career_history",
        sourcePath: "fixtures/history.md",
        sourceSection: "Example Facilities Organization",
        path: "careerHistory.example.1",
        value: "Title: Director, Building Operations Location: New York, New York Dates: 2022–Present",
        status: "needs_review",
        decision: "confirmed",
        decidedAt: timestamp,
      },
      {
        id: "verified_career_history_020",
        sourceId: "career_history",
        sourcePath: "fixtures/history.md",
        sourceSection: "Earlier roles",
        path: "careerHistory.earlier.20",
        value: "Example Technical Services — Chief Engineer — June 1997–March 2015",
        status: "needs_review",
        decision: "confirmed",
        decidedAt: timestamp,
      },
      {
        id: "education_credentials_001",
        sourceId: "education",
        sourcePath: "fixtures/education.md",
        sourceSection: "Education",
        path: "education.1",
        value: "Example College: Associate Degree, 2000–2001",
        status: "needs_review",
        decision: "confirmed",
        decidedAt: timestamp,
      },
    ],
  });
  const sources = renderDocumentSources(
    reviewed,
    { fullName: "Alex Example", email: "alex@example.test", phone: "+1 555 0100" },
    "executive",
    careerProfile,
  );
  assert.match(sources.cv, /Professional experience/);
  assert.match(sources.cv, /Example Facilities Organization/);
  assert.match(sources.cv, /Chief Engineer/);
  assert.match(sources.cv, /Education/);
  assert.match(sources.cv, /\\newpage\s+\\themesection\{Earlier career\}/);
});

test("built-in themes are fixed, coordinated, and recommended from the role title", () => {
  assert.deepEqual(documentThemes.map((theme) => theme.id), [
    "executive",
    "technical",
    "ats_classic",
    "government",
    "modern",
  ]);
  assert.equal(recommendDocumentTheme("Director, Global Logistics"), "executive");
  assert.equal(recommendDocumentTheme("Senior Data Engineer"), "technical");
  assert.equal(recommendDocumentTheme("Federal Compliance Officer"), "ats_classic");
  assert.equal(recommendDocumentTheme("Municipal Compliance Officer"), "government");
  assert.equal(recommendDocumentTheme("Product Strategy Lead"), "modern");
  assert.equal(recommendDocumentTheme("Account Representative"), "ats_classic");

  const application = buildApplication(intake, profile, new Date(timestamp));
  const reviewed = {
    ...application,
    status: "review_complete",
    draft: {
      ...application.draft,
      claims: application.draft.claims.map((claim) => ({ ...claim, decision: "verified", reviewedAt: timestamp })),
    },
  };
  const identity = { fullName: "Alex Example", email: "alex@example.test", phone: "+1 555 0100" };
  const executive = renderDocumentSources(reviewed, identity, "executive");
  const technical = renderDocumentSources(reviewed, identity, "technical");
  assert.notEqual(executive.cv, technical.cv);
  assert.match(executive.cv, /243B53/);
  assert.match(executive.cover, /243B53/);
  assert.match(technical.cv, /176B87/);
  assert.match(technical.cover, /176B87/);
  const allSources = Object.fromEntries(documentThemes.map((theme) => [
    theme.id,
    renderDocumentSources(reviewed, identity, theme.id),
  ]));
  assert.match(allSources.executive.cv, /Executive profile/);
  assert.match(allSources.technical.cv, /Technical profile/);
  assert.match(allSources.ats_classic.cv, /Professional summary/);
  assert.match(allSources.government.cv, /Professional summary/);
  assert.match(allSources.modern.cv, /Professional profile/);
  for (const sources of Object.values(allSources)) {
    assert.doesNotMatch(sources.cv, /Keyword alignment|Visible gaps|Evidence-grounded detail/);
    assert.equal((sources.cv.match(/Led product strategy and analytics delivery/g) ?? []).length, 1);
  }
});

test("AI documents cannot render after a generated claim is rejected", () => {
  const baseline = buildApplication(intake, profile, new Date(timestamp));
  const application = applyAiWriting(baseline, {
    method: "ai",
    model: "fixture-writing-model",
    value: {
      visualDirection,
      positioningSummary: { text: "Grounded product strategy leader prepared to coordinate complex delivery.", evidenceIds: ["evidence_strategy"] },
      resumeBullets: [
        { text: "Led product strategy and coordinated cross-functional analytics delivery.", evidenceIds: ["evidence_strategy"] },
        { text: "Aligned delivery priorities across collaborating teams and stakeholders.", evidenceIds: ["evidence_strategy"] },
        { text: "Connected analytics work to clear operating decisions and execution.", evidenceIds: ["evidence_strategy"] },
      ],
      coverLetter: {
        opening: "This opportunity combines the strategic and operational work that has shaped my career.",
        bodyParagraphs: [
          { text: "I have led product strategy and analytics delivery across cross-functional teams.", evidenceIds: ["evidence_strategy"] },
          { text: "That experience prepared me to bring clarity and coordination to complex priorities.", evidenceIds: ["evidence_strategy"] },
        ],
        closing: "I would welcome the opportunity to discuss how I could contribute to the team.",
      },
    },
  });
  const rejected = {
    ...application,
    status: "review_complete",
    draft: {
      ...application.draft,
      claims: application.draft.claims.map((claim, index) => ({
        ...claim,
        decision: index === 0 ? "do_not_use" : "verified",
        reviewedAt: timestamp,
      })),
    },
  };
  assert.throws(
    () => renderDocumentSources(rejected, {
      fullName: "Alex Example",
      email: "alex@example.test",
      phone: "+1 555 0100",
    }),
    /Regenerate the AI draft/,
  );
});

test("readiness cannot be marked ready while a required check is incomplete", () => {
  assert.throws(() => documentReadinessSchema.parse({
    schemaVersion: 2,
    applicationId: "app_fixture",
    applicationRevision: 1,
    themeId: "ats_classic",
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
  const service = new DocumentService(root, async () => null);
  const readiness = await service.generate(reviewed, {
    fullName: "Alex Example",
    email: "alex@example.test",
    phone: "+1 555 0100",
  }, "executive", new Date(timestamp));
  assert.equal(readiness.themeId, "executive");
  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.checks.find((item) => item.id === "document_tools").status, "failed");
  assert.ok(readiness.artifacts.some((artifact) => artifact.kind === "cv_source"));
  assert.ok(readiness.checks.every((item) => item.status !== "passed" || item.id !== "cv_pages"));
  await assert.rejects(
    () => service.confirmVisualReview(application.id, application.revision),
    /All employer-facing PDFs must exist/,
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

test("user-selected imports are scored, risk-reviewed, and deduplicated locally", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-job-import-"));
  const first = await importJob(root, {
    portal: "indeed-search",
    title: "Product Strategy Manager",
    company: "Example Company",
    location: "New York, NY",
    url: "https://www.indeed.com/viewjob?jk=one",
    description: "Lead product strategy and analytics delivery for cross-functional teams. A processing fee is required before the interview.",
  }, profile);
  assert.equal(first.jobs[0].riskReview.level, "high");
  assert.ok(first.jobs[0].score > 0);
  assert.ok(first.jobs[0].matchedTerms.includes("strategy"));
  const second = await importJob(root, {
    portal: "indeed-search",
    title: "Product Strategy Manager",
    company: "Example Company",
    location: "New Jersey",
    url: "https://www.indeed.com/viewjob?jk=two",
    description: "A revised description for the same visible opportunity.",
  }, profile);
  assert.equal(second.jobs[1].duplicateOf, second.jobs[0].id);
  const afterDelete = await deleteJob(root, second.jobs[0].id);
  assert.equal(afterDelete.jobs.length, 1);
  assert.equal(afterDelete.jobs[0].duplicateOf, undefined);
});

test("structured resumes derive role-specific competencies from verified AI resume claims", () => {
  const competencies = tailoredCompetencies(
    "Lead facilities operations, preventive maintenance, boilers, low-pressure steam, compressed air, vendor coordination, regulatory compliance, and CMMS maintenance controls.",
    ["Generic fallback skill"],
  );
  assert.deepEqual(competencies.slice(0, 7), [
    "Facilities Operations",
    "Preventive Maintenance",
    "Vendor & Contractor Management",
    "Boilers & Steam Systems",
    "Compressed Air",
    "Regulatory Compliance",
    "CMMS & Maintenance Controls",
  ]);
  assert.ok(competencies.indexOf("Generic fallback skill") > competencies.indexOf("CMMS & Maintenance Controls"));
});

test("certification numbers never become visual performance metrics", () => {
  const claims = [{
    text: "Support compliance with OSHA 30-Hour Construction Safety and EPA 608 Universal Certification.",
    evidenceIds: ["credential_record"],
  }];
  assert.deepEqual(verifiedMetricCallouts(claims, new Set(["actual_metric_record"])), []);
});

test("recapturing the same posting upgrades an incomplete saved description", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-job-recapture-"));
  const url = "https://www.indeed.com/viewjob?jk=recapture";
  const initial = await importJob(root, {
    portal: "indeed-search",
    title: "Facilities Director",
    company: "Example Campus",
    url,
    description: "Short preview of the role.",
  }, profile);
  const jobId = initial.jobs[0].id;
  const fullDescription = "Lead facilities, construction, capital planning, compliance, and vendor operations across a complex campus. ".repeat(8);
  const refreshed = await importJob(root, {
    portal: "indeed-search",
    title: "Facilities Director",
    company: "Example Campus",
    location: "New York, NY",
    url,
    description: fullDescription,
    postedAt: "2026-07-31",
  }, profile);
  assert.equal(refreshed.jobs.length, 1);
  assert.equal(refreshed.jobs[0].id, jobId);
  assert.equal(refreshed.jobs[0].description, fullDescription.trim());
  assert.equal(refreshed.jobs[0].location, "New York, NY");
  assert.equal(refreshed.jobs[0].postedAt, "2026-07-31");
});

test("a clean recapture replaces a longer description polluted by embedded page CSS", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-job-css-recapture-"));
  const url = "https://www.indeed.com/viewjob?jk=css-recapture";
  const polluted = `@layer htmlContent { #react-native-html-content { padding-top: 1px; font-family: "IndeedSans"; } This is added to include the bounding client rectanble height. } ${"irrelevant style content ".repeat(30)}`;
  await importJob(root, {
    portal: "indeed-search",
    title: "Facilities Director",
    company: "Example Campus",
    url,
    description: polluted,
  }, profile);
  const clean = "Lead facilities operations, construction planning, preventive maintenance, compliance, budgets, vendors, and staff across a complex public campus. ".repeat(3);
  const refreshed = await importJob(root, {
    portal: "indeed-search",
    title: "Facilities Director",
    company: "Example Campus",
    url,
    description: clean,
  }, profile);
  assert.equal(refreshed.jobs[0].description, clean.trim());
  assert.ok(!refreshed.jobs[0].gaps.includes("htmlcontent"));
  assert.ok(!refreshed.jobs[0].gaps.includes("bounding"));
});

test("recapturing the same posting corrects stale title and company headers", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-job-header-recapture-"));
  const url = "https://www.indeed.com/viewjob?jk=header-recapture";
  const description = "Lead facilities operations, maintenance, compliance, projects, budgets, vendors, and staff across a complex operating environment. ".repeat(3);
  const initial = await importJob(root, {
    portal: "indeed-search",
    title: "Stale sidebar title",
    company: "Stale sidebar company",
    location: "Stale City, NJ",
    url,
    description,
  }, profile);
  const refreshed = await importJob(root, {
    portal: "indeed-search",
    title: "Director of Facilities",
    company: "Correct Employer",
    location: "New York, NY",
    url,
    description,
  }, profile);
  assert.equal(refreshed.jobs.length, 1);
  assert.equal(refreshed.jobs[0].id, initial.jobs[0].id);
  assert.equal(refreshed.jobs[0].title, "Director of Facilities");
  assert.equal(refreshed.jobs[0].company, "Correct Employer");
  assert.equal(refreshed.jobs[0].location, "New York, NY");
});

test("job deletion cascades through workflow records and dismisses its application lineage", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-delete-cascade-"));
  const url = "https://www.indeed.com/viewjob?jk=cascade";
  const application = buildApplication({ ...intake, url }, profile, new Date(timestamp));
  const reviewed = {
    ...application,
    status: "review_complete",
    draft: {
      ...application.draft,
      claims: application.draft.claims.map((claim) => ({ ...claim, decision: "verified", reviewedAt: timestamp })),
    },
  };
  await new ApplicationStore(root).saveNew(reviewed);
  const imported = await importJob(root, {
    portal: "indeed-search",
    title: intake.positionTitle,
    company: intake.companyName,
    location: intake.location,
    url,
    description: intake.description,
  }, profile);
  await transitionPipeline(root, { applicationId: reviewed.id, expectedRevision: 0, to: "drafting" });
  await createInterviewPack(root, { applicationId: reviewed.id, stage: "phone_screen" });
  await recordOutcome(root, { applicationId: reviewed.id, status: "in_progress", note: "Screen scheduled." });
  await saveCompanyInsight(root, {
    jobId: imported.jobs[0].id,
    company: intake.companyName,
    role: intake.positionTitle,
    report: "A sourced fixture company report.",
    citations: [{ startIndex: 2, endIndex: 9, title: "Fixture source", url: "https://example.com/source" }],
    generatedAt: timestamp,
    model: "fixture-model",
  });
  const deleted = await deleteJob(root, imported.jobs[0].id);
  assert.deepEqual(deleted.jobs, []);
  assert.deepEqual(deleted.pipeline, []);
  assert.deepEqual(deleted.interviews, []);
  assert.deepEqual(deleted.outcomes, []);
  assert.deepEqual(deleted.companyInsights, []);
  assert.deepEqual(deleted.dismissedApplicationIds, [reviewed.id]);
});

test("company insight records survive a store reload with citations intact", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-insights-"));
  const imported = await importJob(root, {
    portal: "indeed-search",
    title: intake.positionTitle,
    company: intake.companyName,
    location: intake.location,
    url: "https://www.indeed.com/viewjob?jk=insight",
    description: intake.description,
  }, profile);
  await saveCompanyInsight(root, {
    jobId: imported.jobs[0].id,
    company: intake.companyName,
    role: intake.positionTitle,
    report: "Current company context from a cited source.",
    citations: [{ startIndex: 0, endIndex: 7, title: "Company source", url: "https://example.com/company" }],
    generatedAt: timestamp,
    model: "fixture-model",
  });
  const reloaded = await new OperationsStore(root).load();
  assert.equal(reloaded.companyInsights.length, 1);
  assert.equal(reloaded.companyInsights[0].jobId, imported.jobs[0].id);
  assert.equal(reloaded.companyInsights[0].citations[0].url, "https://example.com/company");
});

test("archive management restores dismissed records and permanently deletes private artifacts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pro-flow-archive-management-"));
  const application = buildApplication(intake, profile, new Date(timestamp));
  const store = new ApplicationStore(root);
  await store.saveNew(application);
  const operations = new OperationsStore(root);
  const initial = await operations.load();
  await operations.save({ ...initial, dismissedApplicationIds: [application.id] }, initial.revision);
  const restored = await restoreApplication(root, application.id);
  assert.deepEqual(restored.dismissedApplicationIds, []);
  const artifactDirectory = path.join(root, "applications", application.id);
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(path.join(artifactDirectory, "resume.pdf"), "private fixture");
  await permanentlyDeleteApplication(root, application.id);
  assert.deepEqual(await listApplicationArchives(root), []);
  await assert.rejects(() => access(artifactDirectory), /ENOENT/);
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
  assert.equal(migrated.schemaVersion, 5);
  assert.deepEqual(migrated.jobs.map((item) => item.portal), ["linkedin-search"]);
  assert.deepEqual(migrated.searches, []);
  assert.deepEqual(migrated.companyInsights, []);
  assert.deepEqual(migrated.dismissedApplicationIds, []);
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
  assert.equal(withInterview.interviews[0].generation.method, "template");
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
