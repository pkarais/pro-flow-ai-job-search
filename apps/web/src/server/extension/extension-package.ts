import { readFile } from "node:fs/promises";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { projectRoot } from "../project-root.ts";

function validBaseUrl(value: string): URL {
  const url = new URL(value);
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (!localHttp) {
    throw new Error("This local-first beta accepts only http://localhost or http://127.0.0.1 URLs.");
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url;
}

function safeName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9 ._-]+/g, "").slice(0, 60) || "Pro Flow Job Capture";
}

export async function buildExtensionPackage(baseUrlInput: string, nameInput: string) {
  const baseUrl = validBaseUrl(baseUrlInput);
  const extensionRoot = path.join(projectRoot(), "browser-extension");
  const [manifestSource, backgroundSource, readmeSource] = await Promise.all([
    readFile(path.join(extensionRoot, "manifest.json"), "utf8"),
    readFile(path.join(extensionRoot, "background.js"), "utf8"),
    readFile(path.join(extensionRoot, "README.md"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource) as Record<string, unknown>;
  manifest.name = safeName(nameInput);
  manifest.host_permissions = [`${baseUrl.origin}/*`];
  const background = backgroundSource
    .replaceAll("http://localhost:3000", baseUrl.origin)
    .replaceAll("http://127.0.0.1:3000", baseUrl.origin);
  const configuration = `# Generated extension configuration\n\nBase URL: ${baseUrl.origin}\n\nGenerated for local unpacked installation. Keep Pro Flow bound to localhost; this beta is not designed for public hosting.\n`;
  const prefix = "pro-flow-job-capture/";
  return Buffer.from(zipSync({
    [`${prefix}manifest.json`]: strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
    [`${prefix}background.js`]: strToU8(background),
    [`${prefix}README.md`]: strToU8(readmeSource),
    [`${prefix}CONFIGURATION.md`]: strToU8(configuration),
  }, { level: 6 }));
}
