import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";
import { buildExtensionPackage } from "../src/server/extension/extension-package.ts";

test("fork users can generate a named extension for their localhost port", async () => {
  const archive = await buildExtensionPackage("http://127.0.0.1:4310", "My Career Capture");
  const files = unzipSync(new Uint8Array(archive));
  const manifest = JSON.parse(strFromU8(files["pro-flow-job-capture/manifest.json"]));
  const background = strFromU8(files["pro-flow-job-capture/background.js"]);

  assert.equal(manifest.name, "My Career Capture");
  assert.deepEqual(manifest.host_permissions, ["http://127.0.0.1:4310/*"]);
  assert.match(background, /http:\/\/127\.0\.0\.1:4310/);
  assert.doesNotMatch(background, /http:\/\/localhost:3000/);
  assert.match(background, /textCandidates/);
  assert.match(background, /decodedHtmlText/);
  assert.match(background, /sort\(\(left, right\) => right\.length - left\.length\)/);
  assert.ok(files["pro-flow-job-capture/CONFIGURATION.md"]);
});

test("extension generation rejects public service URLs", async () => {
  await assert.rejects(
    () => buildExtensionPackage("https://example.com", "Unsafe Capture"),
    /accepts only http:\/\/localhost or http:\/\/127\.0\.0\.1/,
  );
});
