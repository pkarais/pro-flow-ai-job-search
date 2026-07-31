import {
  candidateProfileSchema,
  type CandidateProfile,
  type ReadinessCheck,
} from "@pro-flow/career-core";

const fixtureEvidence = {
  sourceId: "fixture_profile",
  sourcePath: "fixtures/example-candidate.md",
  importedAt: "2026-07-30T12:00:00-04:00",
};

const verified = {
  status: "verified" as const,
  evidence: [fixtureEvidence],
};

const fact = <T,>(value: T) => ({ value, provenance: verified });

const fixtureInput = {
  schemaVersion: 1,
  id: "example_candidate",
  identity: {
    fullName: fact("Example Candidate"),
    location: fact("New York metropolitan area"),
    languages: [fact("English")],
  },
  positioning: {
    primary: fact("Operations and systems leader"),
    supporting: [
      fact("Facilities and infrastructure"),
      fact("Operational excellence"),
    ],
  },
  careerHistory: [],
  education: [],
  skills: [],
  projects: [],
  voiceRules: [fact("Direct, practical, and specific")],
  prohibitedClaims: [],
  searchPreferences: {
    coreRoles: ["Director of Operations"],
    adjacentRoles: ["Operational Excellence Leader"],
    stretchRoles: ["Vice President of Operations"],
    locations: ["New York"],
    workModes: ["hybrid" as const],
    dealBreakers: [],
  },
  updatedAt: "2026-07-30T12:00:00-04:00",
};

export const fixtureProfile: CandidateProfile =
  candidateProfileSchema.parse(fixtureInput);

export const fixtureReadinessChecks: ReadinessCheck[] = [
  {
    id: "identity",
    label: "Identity and contact details",
    required: true,
    status: "passed",
    detail: "Core identity information is confirmed.",
  },
  {
    id: "career_history",
    label: "Career history",
    required: true,
    status: "pending",
    detail: "Add or import verified employment history.",
  },
  {
    id: "search_preferences",
    label: "Search preferences",
    required: true,
    status: "passed",
    detail: "Role families and location preferences are ready.",
  },
  {
    id: "evidence_review",
    label: "Evidence review",
    required: true,
    status: "pending",
    detail: "Resolve imported facts before generating applications.",
  },
];

export const fixturePipeline = [
  { label: "Saved roles", value: 12, detail: "4 new this week" },
  { label: "In progress", value: 3, detail: "1 needs review" },
  { label: "Interviews", value: 2, detail: "Next on Friday" },
] as const;

export const fixtureWorkflow = [
  {
    number: "01",
    label: "Build your foundation",
    detail: "Confirm the facts and preferences every application will use.",
    status: "current" as const,
  },
  {
    number: "02",
    label: "Find the right opportunities",
    detail: "Search broadly, then rank roles using explainable fit criteria.",
    status: "upcoming" as const,
  },
  {
    number: "03",
    label: "Create a grounded application",
    detail: "Tailor the story without inventing experience or outcomes.",
    status: "upcoming" as const,
  },
  {
    number: "04",
    label: "Verify and move forward",
    detail: "Review claims, documents, ATS output, interviews, and outcomes.",
    status: "upcoming" as const,
  },
] as const;
