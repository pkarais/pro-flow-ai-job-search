import { existsSync } from "node:fs";
import path from "node:path";

export function projectRoot(): string {
  const configured = process.env.PRO_FLOW_PROJECT_ROOT?.trim();
  const candidates = [
    configured,
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const root = candidates.find((candidate) =>
    existsSync(path.join(candidate, "apps", "web", "package.json"))
    && existsSync(path.join(candidate, "packages", "career-core", "package.json")),
  );
  if (!root) throw new Error("Pro Flow could not locate its repository root. Set PRO_FLOW_PROJECT_ROOT to the cloned project directory.");
  return path.resolve(root);
}
