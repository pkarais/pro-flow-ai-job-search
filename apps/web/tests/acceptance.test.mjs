import assert from "node:assert/strict";
import test from "node:test";

import { buildAcceptancePlan } from "../src/lib/acceptance.ts";

const empty = {
  evidenceTotal: 0,
  evidenceReviewed: 0,
  searches: 0,
  applications: 0,
  reviewedApplications: 0,
  readyDocuments: 0,
  pipelineRecords: 0,
  interviews: 0,
  outcomes: 0,
};

test("acceptance starts with evidence and never treats an empty profile as complete", () => {
  const plan = buildAcceptancePlan(empty);
  assert.equal(plan.completed, 0);
  assert.equal(plan.percent, 0);
  assert.equal(plan.next?.id, "evidence");
  assert.equal(plan.steps.filter((step) => step.status === "current").length, 1);
});

test("acceptance selects the first incomplete milestone as the next action", () => {
  const plan = buildAcceptancePlan({
    ...empty,
    evidenceTotal: 12,
    evidenceReviewed: 12,
    searches: 2,
    applications: 1,
  });
  assert.equal(plan.completed, 3);
  assert.equal(plan.next?.id, "claims");
  assert.equal(plan.next?.href, "/applications/new#workspace");
});

test("acceptance can report a completed end-to-end workflow", () => {
  const plan = buildAcceptancePlan({
    evidenceTotal: 12,
    evidenceReviewed: 12,
    searches: 1,
    applications: 1,
    reviewedApplications: 1,
    readyDocuments: 1,
    pipelineRecords: 1,
    interviews: 1,
    outcomes: 1,
  });
  assert.equal(plan.completed, 8);
  assert.equal(plan.percent, 100);
  assert.equal(plan.next, null);
  assert.ok(plan.steps.every((step) => step.status === "complete"));
});

test("later work does not bypass an earlier incomplete safety milestone", () => {
  const plan = buildAcceptancePlan({
    ...empty,
    applications: 2,
    reviewedApplications: 1,
    readyDocuments: 1,
    pipelineRecords: 1,
  });
  assert.equal(plan.next?.id, "evidence");
  assert.equal(plan.steps.find((step) => step.id === "documents")?.complete, true);
});
