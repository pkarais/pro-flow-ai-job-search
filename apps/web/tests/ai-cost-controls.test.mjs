import assert from "node:assert/strict";
import test from "node:test";
import { cleanOpportunityText, compactInsight, maxOutputTokens, modelFor, promptCacheKey } from "../src/server/ai/ai-policy.ts";
import { activeAiRequestCount, aiRequestKey, singleFlight } from "../src/server/ai/ai-single-flight.ts";

test("final writing keeps the flagship model while support work defaults to terra", () => {
  const originalModel = process.env.OPENAI_MODEL;
  const originalSupport = process.env.OPENAI_SUPPORT_MODEL;
  const originalInsights = process.env.OPENAI_INSIGHTS_MODEL;
  delete process.env.OPENAI_MODEL;
  delete process.env.OPENAI_SUPPORT_MODEL;
  delete process.env.OPENAI_INSIGHTS_MODEL;
  try {
    assert.equal(modelFor("application_writing"), "gpt-5.6-sol");
    assert.equal(modelFor("refinement_suggestions"), "gpt-5.6-terra");
    assert.equal(modelFor("interview_writing"), "gpt-5.6-terra");
    assert.equal(modelFor("company_overview"), "gpt-5.6-terra");
  } finally {
    if (originalModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = originalModel;
    if (originalSupport === undefined) delete process.env.OPENAI_SUPPORT_MODEL; else process.env.OPENAI_SUPPORT_MODEL = originalSupport;
    if (originalInsights === undefined) delete process.env.OPENAI_INSIGHTS_MODEL; else process.env.OPENAI_INSIGHTS_MODEL = originalInsights;
  }
});

test("captured opportunity text removes page code and obeys its token proxy budget", () => {
  const cleaned = cleanOpportunityText(`<style>.card { margin: 10px; display: block; }</style><h1>Facilities Director</h1><script>alert(1)</script><p>Maintain HVAC and utilities.</p>`, 80);
  assert.equal(cleaned, "Facilities Director Maintain HVAC and utilities.");
  assert.ok(cleaned.length <= 80);
});

test("AI limits and cache keys are deterministic per operation", () => {
  assert.ok(maxOutputTokens("application_writing") > maxOutputTokens("refinement_suggestions"));
  assert.equal(compactInsight("A\n\n\n\nB", 3), "A\n\n");
  assert.equal(promptCacheKey("application_writing", "candidate"), promptCacheKey("application_writing", "candidate"));
  assert.notEqual(promptCacheKey("application_writing", "candidate"), promptCacheKey("interview_writing", "candidate"));
});

test("concurrent identical AI requests execute the provider action exactly once", async () => {
  let executions = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const key = aiRequestKey("application_writing", { applicationId: "same", revision: 4 });
  const action = async () => {
    executions += 1;
    await gate;
    return { id: "resp_single" };
  };
  const first = singleFlight(key, action);
  const second = singleFlight(key, action);
  assert.equal(executions, 1);
  assert.equal(activeAiRequestCount(), 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), [{ id: "resp_single" }, { id: "resp_single" }]);
  assert.equal(executions, 1);
  assert.equal(activeAiRequestCount(), 0);
});
