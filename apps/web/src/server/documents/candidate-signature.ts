import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadCandidateSignatureDataUri(dataRoot: string): Promise<string | null> {
  try {
    const image = await readFile(path.join(dataRoot, "assets", "signature.png"));
    return `data:image/png;base64,${image.toString("base64")}`;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function loadCandidateBannerDataUri(dataRoot: string): Promise<string | null> {
  try {
    const image = await readFile(path.join(dataRoot, "assets", "executive-banner-v2.png"));
    return `data:image/png;base64,${image.toString("base64")}`;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "ENOENT") return null;
    throw error;
  }
}
