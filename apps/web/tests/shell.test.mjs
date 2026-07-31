import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  fixtureProfile,
  fixtureReadinessChecks,
  fixtureWorkflow,
} from "../src/lib/fixtures.ts";
import { navigationItems } from "../src/lib/navigation.ts";

test("the web shell fixture is validated by career-core", () => {
  assert.equal(fixtureProfile.id, "example_candidate");
  assert.equal(fixtureProfile.schemaVersion, 1);
});

test("the shell exposes the complete planned primary navigation", () => {
  assert.deepEqual(
    navigationItems.map((item) => item.label),
    ["Home", "My Career", "Find Jobs", "Applications", "Interview", "Insights"],
  );
});

test("career navigation opens the evidence review route", () => {
  const career = navigationItems.find((item) => item.label === "My Career");
  assert.equal(career?.href, "/career/import-review");
});

test("home navigation is a real route rather than a page-local anchor", () => {
  const home = navigationItems.find((item) => item.label === "Home");
  assert.equal(home?.href, "/");
});

test("every workflow stage has user-facing guidance", () => {
  assert.equal(fixtureWorkflow.length, 4);
  assert.ok(fixtureWorkflow.every((step) => step.label && step.detail));
  assert.equal(fixtureWorkflow.filter((step) => step.status === "current").length, 1);
});

test("fixture readiness includes unresolved required work", () => {
  assert.ok(
    fixtureReadinessChecks.some(
      (check) => check.required && check.status === "pending",
    ),
  );
});

test("fixture source paths cannot point at personal-data directories", () => {
  const evidence = fixtureProfile.identity.fullName.provenance.evidence;
  assert.ok(evidence.every((item) => item.sourcePath.startsWith("fixtures/")));
  assert.ok(evidence.every((item) => !item.sourcePath.includes("career-data/")));
  assert.ok(evidence.every((item) => !item.sourcePath.includes("documents/")));
});

test("grouped searches expose user-initiated redirect links without opening tabs", async () => {
  const workspace = await readFile(
    new URL("../src/components/operations-workspace.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(workspace.includes('window.open("about:blank"'), false);
  assert.equal(workspace.includes("window.open(search.url"), false);
  assert.ok(workspace.includes("/api/operations/search?"));
  assert.ok(workspace.includes("Open {search.label}"));
  assert.ok(workspace.includes("Bring job into Pro Flow"));
  assert.ok(workspace.includes("Create resume &amp; cover letter"));
  assert.ok(workspace.includes("/applications/new?jobId="));
});

test("the application studio can prefill a selected saved job", async () => {
  const page = await readFile(
    new URL("../src/app/applications/new/page.tsx", import.meta.url),
    "utf8",
  );
  const workspace = await readFile(
    new URL("../src/components/application-workspace.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(page.includes("OperationsStore"));
  assert.ok(page.includes("initialOpportunity"));
  assert.ok(workspace.includes("Review the selected posting"));
  assert.ok(workspace.includes("defaultValue={initialOpportunity?.description}"));
});

test("career review is standalone and reads Pro Flow canonical evidence", async () => {
  const page = await readFile(
    new URL("../src/app/career/import-review/page.tsx", import.meta.url),
    "utf8",
  );
  const route = await readFile(
    new URL("../src/app/api/career/evidence-decision/route.ts", import.meta.url),
    "utf8",
  );
  assert.equal(page.includes("EXECUTIVE_CAREER_OS_PATH"), false);
  assert.equal(page.includes("loadExecutiveEvidencePreview"), false);
  assert.ok(page.includes("loadCanonicalReview"));
  assert.ok(route.includes("decideCanonicalFact"));
});
