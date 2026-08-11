import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { strFromU8, unzipSync } from "fflate";

const execFileAsync = promisify(execFile);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ITEMS = 150;

export type ResumeEvidenceCategory = "experience" | "skills" | "projects" | "education" | "credentials" | "other";

export type ResumeEvidencePreviewItem = {
  id: string;
  category: ResumeEvidenceCategory;
  section: string;
  value: string;
};

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function docxText(buffer: Buffer): string {
  const archive = unzipSync(new Uint8Array(buffer));
  const document = archive["word/document.xml"];
  if (!document) throw new Error("This DOCX does not contain a readable document body.");
  return decodeXml(strFromU8(document)
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, ""));
}

async function pdfText(buffer: Buffer): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "pro-flow-resume-"));
  const source = path.join(directory, "resume.pdf");
  const output = path.join(directory, "resume.txt");
  try {
    await writeFile(source, buffer, { flag: "wx" });
    await execFileAsync("pdftotext", ["-layout", source, output], { timeout: 30_000, windowsHide: true });
    return await readFile(output, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("PDF extraction is unavailable. Run Pro Flow through Docker Desktop or upload a DOCX file.");
    }
    throw new Error("The PDF contains no extractable text or could not be read.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const sectionMatchers: Array<[RegExp, ResumeEvidenceCategory, string]> = [
  [/^(experience|employment|work history|professional experience|career history)$/i, "experience", "Professional Experience"],
  [/^(skills|technical skills|core competencies|competencies|capabilities|technologies)$/i, "skills", "Skills and Capabilities"],
  [/^(projects|selected projects|personal projects)$/i, "projects", "Projects and Systems"],
  [/^(education|academic background)$/i, "education", "Education"],
  [/^(certifications?|credentials?|licenses?|professional development)$/i, "credentials", "Credentials"],
  [/^(summary|profile|professional summary|objective)$/i, "other", "Professional Summary"],
];

function sectionFor(line: string): [ResumeEvidenceCategory, string] | null {
  const normalized = line.replace(/[:|]+$/, "").trim();
  for (const [matcher, category, section] of sectionMatchers) {
    if (matcher.test(normalized)) return [category, section];
  }
  return null;
}

export function parseResumeText(text: string): ResumeEvidencePreviewItem[] {
  const rawLines = text.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/\s+/g, " ").trim());
  const items: ResumeEvidencePreviewItem[] = [];
  let category: ResumeEvidenceCategory = "other";
  let section = "Resume Overview";
  let pending = "";

  const flush = () => {
    const value = pending.replace(/^[•·▪◦*\-–—]\s*/, "").trim();
    pending = "";
    if (value.length < 3 || value.length > 2_000) return;
    if (/^(page \d+|references available upon request)$/i.test(value)) return;
    items.push({ id: `resume_${items.length + 1}`, category, section, value });
  };

  for (const line of rawLines) {
    if (!line) { flush(); continue; }
    const nextSection = sectionFor(line);
    if (nextSection) {
      flush();
      [category, section] = nextSection;
      continue;
    }
    flush();
    pending = line;
    if (items.length >= MAX_ITEMS) break;
  }
  flush();
  return items.slice(0, MAX_ITEMS);
}

export async function extractResume(file: File): Promise<{ fileName: string; items: ResumeEvidencePreviewItem[] }> {
  if (file.size <= 0) throw new Error("Choose a non-empty résumé file.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Résumé files must be 10 MB or smaller.");
  const extension = path.extname(file.name).toLowerCase();
  if (extension !== ".pdf" && extension !== ".docx") throw new Error("Upload a PDF or DOCX résumé.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = extension === ".pdf" ? await pdfText(buffer) : docxText(buffer);
  const items = parseResumeText(text);
  if (!items.length) throw new Error("No readable résumé text was found in this file.");
  return { fileName: path.basename(file.name).replace(/[^a-zA-Z0-9._ -]/g, "_"), items };
}
