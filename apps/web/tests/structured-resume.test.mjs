import assert from "node:assert/strict";
import test from "node:test";
import { structuredResumeSchema } from "../../../packages/career-core/dist/index.js";
import { renderDesignedResumeHtml } from "../src/server/documents/html-resume-renderer.ts";
import { renderDesignedCoverLetterHtml } from "../src/server/documents/cover-letter-renderer.ts";
import { renderCoverLetterDocx, renderResumeDocx } from "../src/server/documents/resume-export-service.ts";
import { resumeIconNames } from "../src/server/documents/design/icon-registry.ts";
import { formatUsPhone } from "../src/server/documents/phone-format.ts";

const resume = structuredResumeSchema.parse({
  schemaVersion: 1,
  applicationId: "app_fixture",
  applicationRevision: 2,
  themeId: "modern",
  artDirection: { palette: "plum", density: "balanced", motif: "line", icons: true, iconSet: "executive", iconTreatment: "outline", rationale: "Polished leadership presentation." },
  identity: { fullName: "Example Candidate", email: "candidate@example.com", phone: "201-555-0100" },
  contactLinks: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/example" }],
  targetTitle: "Director of Operations",
  targetPositioning: { employer: "Example Employer", location: "New York, NY" },
  summary: "Operations leader connecting field execution, accountable systems, and executive decision-making.",
  expertise: ["Facilities operations", "Preventive maintenance", "Vendor management"],
  competencyGroups: [{ label: "Operations", items: ["Facilities operations", "Preventive maintenance"] }],
  experience: [{
    employer: "Example Organization",
    title: "Director, Building and Facilities Operations",
    location: "New York, NY",
    dates: "2020 - Present",
    highlights: ["Manage daily operations and coordinate major repair work with personnel and vendors."],
    evidenceIds: ["verified_career_history_001"],
  }],
  secondaryExpertise: ["Operational reporting", "Life-safety coordination"],
  education: ["Example College - Degree"],
  projectsAndSystems: [{ name: "Operations platform", description: "Maintenance and reporting workflows.", evidenceIds: ["verified_career_history_001"] }],
  credentials: ["Example College - Degree"],
  verifiedMetrics: [],
  optionalVisuals: { sectionIcons: true, competencyBlocks: true, metricCallouts: false },
  generatedFromEvidenceIds: ["verified_career_history_001"],
});

test("designed HTML is self-contained, printable, and grounded in the structured resume", () => {
  const html = renderDesignedResumeHtml(resume);
  assert.match(html, /@page\s*\{\s*size:\s*Letter/i);
  assert.match(html, /Example Candidate/);
  assert.match(html, /Director of Operations/);
  assert.match(html, /candidate@example\.com/);
  assert.match(html, /\(201\) 555-0100/);
  assert.doesNotMatch(html, /<script|<(?:img|link|script)[^>]+https?:\/\//i);
});

test("U.S. phone numbers use the employer-facing display format", () => {
  assert.equal(formatUsPhone("2125550100"), "(212) 555-0100");
  assert.equal(formatUsPhone("1-201-856-1173"), "(201) 856-1173");
  assert.equal(formatUsPhone("(201) 856-1173"), "(201) 856-1173");
});

test("editable DOCX export is a valid Office zip package", async () => {
  const output = await renderResumeDocx(resume);
  assert.ok(output.length > 1_000);
  assert.equal(output.subarray(0, 2).toString("ascii"), "PK");
});

test("cover letter HTML and DOCX form a coordinated, self-contained document", async () => {
  const letter = "Dear Hiring Manager,\n\nI am writing to bring evidence-grounded operations leadership to Example Employer.\n\nMy background connects facilities, maintenance, and accountable management systems.\n\nSincerely,\n\n[Your name]";
  const html = renderDesignedCoverLetterHtml(resume, letter);
  assert.match(html, /@page\s*\{\s*size:\s*Letter/i);
  assert.match(html, /Example Candidate/);
  assert.match(html, /Example Employer/);
  assert.match(html, /\(201\) 555-0100/);
  assert.match(html, /evidence-grounded operations leadership/);
  assert.doesNotMatch(html, /\[Your name\]|<(?:img|link|script)[^>]+https?:\/\//i);
  const docx = await renderCoverLetterDocx(resume, letter);
  assert.ok(docx.length > 1_000);
  assert.equal(docx.subarray(0, 2).toString("ascii"), "PK");
});

test("the local resume icon registry provides substantial reviewed variety", () => {
  assert.ok(resumeIconNames.length >= 30);
  for (const expected of ["operations", "facilities", "engineering", "logistics", "compliance", "technology", "leadership"]) {
    assert.ok(resumeIconNames.includes(expected));
  }
});

test("each resume theme produces a genuinely distinct composition", () => {
  const outputs = ["executive", "technical", "ats_classic", "government", "modern"]
    .map((themeId) => renderDesignedResumeHtml({ ...resume, themeId }));
  assert.equal(new Set(outputs).size, 5);
  for (const themeId of ["executive", "technical", "ats_classic", "government", "modern"]) {
    assert.match(outputs.find((output) => output.includes(`theme-${themeId}`)), new RegExp(`theme-${themeId}`));
  }
});
