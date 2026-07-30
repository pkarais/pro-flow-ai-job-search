import assert from "node:assert/strict";
import test from "node:test";

import {
  applicationPackageSchema,
  canTransition,
  candidateProfileSchema,
  factualClaimSchema,
  isReadyForSubmission,
  opportunitySchema,
  provenanceSchema,
} from "../dist/index.js";

const evidence = {
  sourceId: "fixture_source",
  sourcePath: "fixtures/profile.md",
  importedAt: "2026-07-30T12:00:00-04:00",
};

const verified = { status: "verified", evidence: [evidence] };
const fact = (value) => ({ value, provenance: verified });

const profile = {
  schemaVersion: 1,
  id: "fixture_candidate",
  identity: {
    fullName: fact("Example Candidate"),
    languages: [],
  },
  positioning: {
    primary: fact("Operations Leader"),
    supporting: [],
  },
  careerHistory: [],
  education: [],
  skills: [],
  projects: [],
  voiceRules: [],
  prohibitedClaims: [],
  searchPreferences: {
    coreRoles: ["Operations Director"],
    adjacentRoles: [],
    stretchRoles: [],
    locations: ["New York"],
    workModes: ["hybrid"],
    dealBreakers: [],
  },
  updatedAt: "2026-07-30T12:00:00-04:00",
};

test("a neutral candidate fixture passes the canonical profile schema", () => {
  assert.equal(candidateProfileSchema.safeParse(profile).success, true);
});

test("verified facts require evidence", () => {
  const result = provenanceSchema.safeParse({ status: "verified", evidence: [] });
  assert.equal(result.success, false);
});

test("a current career range cannot also have an end date", () => {
  const invalid = structuredClone(profile);
  invalid.careerHistory = [{
    id: "role_1",
    employer: fact("Example Company"),
    title: fact("Director"),
    dates: fact({ start: "2024", end: "2025", current: true }),
    responsibilities: [],
    achievements: [],
  }];
  assert.equal(candidateProfileSchema.safeParse(invalid).success, false);
});

test("opportunity descriptions enforce useful minimum content", () => {
  const result = opportunitySchema.safeParse({
    id: "job_1",
    source: "manual",
    companyName: "Example Company",
    positionTitle: "Director",
    workMode: "hybrid",
    description: "",
    capturedAt: "2026-07-30T12:00:00-04:00",
  });
  assert.equal(result.success, false);
});

test("supported claims require evidence IDs", () => {
  const result = factualClaimSchema.safeParse({
    id: "claim_1",
    claim: "Supported leadership claim",
    evidenceIds: [],
    status: "supported",
  });
  assert.equal(result.success, false);
});

test("application packages are always drafts in the contract", () => {
  const result = applicationPackageSchema.safeParse({
    id: "application_1",
    opportunityId: "job_1",
    profileVersion: 1,
    executiveSummary: "Summary",
    tailoredResume: "Resume",
    coverLetter: "Letter",
    atsAnalysis: {
      matchedKeywords: [],
      missingKeywords: [],
      transferableKeywords: [],
      alignmentSummary: "Alignment",
    },
    interviewTalkingPoints: [],
    claims: [],
    missingInformation: [],
    generatedAt: "2026-07-30T12:00:00-04:00",
    draft: false,
  });
  assert.equal(result.success, false);
});

test("workflow transitions reject unsafe skips", () => {
  assert.equal(canTransition("discovered", "shortlisted"), true);
  assert.equal(canTransition("discovered", "ready"), false);
  assert.equal(canTransition("ready", "applied"), true);
});

test("submission readiness requires every required check to pass", () => {
  assert.equal(isReadyForSubmission([
    { id: "claims", label: "Claims reviewed", required: true, status: "passed" },
    { id: "pdf", label: "PDF checked", required: true, status: "failed" },
    { id: "optional", label: "Optional note", required: false, status: "pending" },
  ]), false);

  assert.equal(isReadyForSubmission([
    { id: "claims", label: "Claims reviewed", required: true, status: "passed" },
    { id: "pdf", label: "PDF checked", required: true, status: "passed" },
  ]), true);
});
