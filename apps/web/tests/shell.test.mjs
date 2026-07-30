import assert from "node:assert/strict";
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
