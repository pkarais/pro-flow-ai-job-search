import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { CanonicalCareerProfile } from "@pro-flow/career-core";
import { effectiveEvidenceValue } from "@pro-flow/career-core";
import { formatUsPhone } from "@/server/documents/phone-format";

export type CandidateContact = { fullName: string; email: string; phone: string };

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?1[\s.()-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/;

function extract(text: string): CandidateContact {
  const email = text.match(emailPattern)?.[0] ?? "";
  const phone = text.match(phonePattern)?.[0] ?? "";
  const fullName = text.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]
    ?.replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&#39;", "'").trim() ?? "";
  return { fullName, email, phone: phone ? formatUsPhone(phone) : "" };
}

async function recentContactArtifact(applicationsRoot: string): Promise<CandidateContact> {
  let directories;
  try {
    directories = await readdir(applicationsRoot, { withFileTypes: true });
  } catch {
    return { fullName: "", email: "", phone: "" };
  }

  const candidates: { file: string; modified: number }[] = [];
  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    for (const name of ["designed-resume.html", "cv-ats.txt", "cv.tex", "cover-letter.tex"]) {
      const file = path.join(applicationsRoot, directory.name, name);
      try {
        candidates.push({ file, modified: (await stat(file)).mtimeMs });
      } catch {
        // Older application revisions may not contain every document format.
      }
    }
  }

  candidates.sort((left, right) => right.modified - left.modified);
  for (const candidate of candidates) {
    const contact = extract(await readFile(candidate.file, "utf8"));
    if (contact.email || contact.phone) return contact;
  }
  return { fullName: "", email: "", phone: "" };
}

export async function resolveCandidateContact(
  dataRoot: string,
  profile: CanonicalCareerProfile | null,
): Promise<CandidateContact> {
  const reviewedText = profile?.records
    .map((record) => effectiveEvidenceValue(record) ?? "")
    .filter(Boolean)
    .join("\n") ?? "";
  const reviewed = extract(reviewedText);
  const artifact = await recentContactArtifact(path.join(dataRoot, "applications"));
  return {
    fullName: artifact.fullName,
    email: reviewed.email || artifact.email,
    phone: reviewed.phone || artifact.phone,
  };
}
