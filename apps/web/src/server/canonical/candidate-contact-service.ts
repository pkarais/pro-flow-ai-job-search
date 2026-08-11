import "server-only";

import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { documentIdentitySchema, type CanonicalCareerProfile } from "@pro-flow/career-core";
import { effectiveEvidenceValue } from "@pro-flow/career-core";
import { formatUsPhone } from "@/server/documents/phone-format";

export type CandidateContact = { fullName: string; email: string; phone: string };
const CONTACT_FILE = "candidate-contact.json";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?1[\s.()-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/;

function extract(text: string): CandidateContact {
  const email = text.match(emailPattern)?.[0] ?? "";
  const phone = text.match(phonePattern)?.[0] ?? "";
  const htmlName = text.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]
    ?.replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&#39;", "'").trim() ?? "";
  const plainName = text.split(/\r?\n/).map((line) => line.trim()).find((line) =>
    line.length >= 4
    && line.length <= 100
    && /^[\p{L}][\p{L}'’-]+(?:\s+[\p{L}][\p{L}'’.-]+){1,4}$/u.test(line)
    && !/^(professional|executive|career|resume|curriculum|experience|education|skills|summary|profile|contact)\b/i.test(line),
  ) ?? "";
  const fullName = htmlName || plainName;
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

async function savedContact(dataRoot: string): Promise<CandidateContact> {
  try {
    return documentIdentitySchema.parse(JSON.parse(await readFile(path.join(dataRoot, CONTACT_FILE), "utf8")));
  } catch {
    return { fullName: "", email: "", phone: "" };
  }
}

export async function saveCandidateContact(dataRoot: string, input: CandidateContact): Promise<CandidateContact> {
  const contact = documentIdentitySchema.parse(input);
  await mkdir(dataRoot, { recursive: true });
  const target = path.join(dataRoot, CONTACT_FILE);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(contact, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporary, target);
  return contact;
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
  const saved = await savedContact(dataRoot);
  const artifact = await recentContactArtifact(path.join(dataRoot, "applications"));
  return {
    fullName: saved.fullName || reviewed.fullName || artifact.fullName,
    email: saved.email || reviewed.email || artifact.email,
    phone: saved.phone || reviewed.phone || artifact.phone,
  };
}
