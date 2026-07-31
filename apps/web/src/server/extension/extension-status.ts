import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { careerDataRoot } from "@/server/canonical/review-service";

const statusPath = () => path.join(careerDataRoot(), "browser-extension.json");

export async function readExtensionStatus() {
  try {
    const parsed = JSON.parse(await readFile(statusPath(), "utf8")) as { installed?: unknown; lastSeenAt?: unknown };
    return {
      installed: parsed.installed === true,
      lastSeenAt: typeof parsed.lastSeenAt === "string" ? parsed.lastSeenAt : null,
    };
  } catch {
    return { installed: false, lastSeenAt: null };
  }
}

export async function recordExtensionCheckIn() {
  const target = statusPath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  const status = { installed: true, lastSeenAt: new Date().toISOString() };
  await writeFile(temporary, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  return status;
}
