import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  documentReadinessSchema,
  type ArchivedApplication,
  type DocumentIdentity,
  type DocumentArtifactRecord,
  type DocumentReadiness,
  type ReadinessCheck,
} from "@pro-flow/career-core";

const execute = promisify(execFile);
const REQUIRED_TOOLS = ["lualatex", "xelatex", "pdfinfo", "pdftotext"] as const;

function escapeLatex(value: string): string {
  return value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("~", "\\textasciitilde{}")
    .replaceAll("^", "\\textasciicircum{}");
}

function verifiedClaims(application: ArchivedApplication) {
  return application.draft.claims.filter((claim) => claim.decision === "verified");
}

export function renderDocumentSources(application: ArchivedApplication, identity: DocumentIdentity): { cv: string; cover: string } {
  const claims = verifiedClaims(application);
  if (application.status !== "review_complete" || claims.length === 0) {
    throw new Error("Complete factual review and verify at least one claim before rendering documents.");
  }
  const title = escapeLatex(application.opportunity.positionTitle);
  const company = escapeLatex(application.opportunity.companyName);
  const fullName = escapeLatex(identity.fullName);
  const email = escapeLatex(identity.email);
  const phone = escapeLatex(identity.phone);
  const items = claims.map((claim) => `\\item ${escapeLatex(claim.text)}`).join("\n");
  const summary = escapeLatex(application.draft.summary);
  const cover = escapeLatex(application.draft.coverLetter);
  return {
    cv: `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{enumitem}
\\pagestyle{plain}
\\begin{document}
\\begin{center}\\LARGE\\textbf{${fullName}}\\\\\\normalsize ${email} $\\vert$ ${phone}\\\\\\large ${title} at ${company}\\end{center}
\\section*{Profile}
${summary}
\\section*{Relevant evidence}
\\begin{itemize}[leftmargin=*]
${items}
\\end{itemize}
\\section*{Keyword alignment}
${escapeLatex(application.draft.matchedKeywords.join(", ") || "No direct matches recorded.")}
\\newpage
\\section*{Evidence-grounded detail}
${items ? `\\begin{itemize}[leftmargin=*]\n${items}\n\\end{itemize}` : ""}
\\section*{Visible gaps}
${escapeLatex(application.draft.gaps.join(", ") || "No keyword gaps detected.")}
\\end{document}
`,
    cover: `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\pagestyle{empty}
\\begin{document}
\\begin{flushright}\\today\\end{flushright}
\\begin{center}\\Large\\textbf{${fullName}}\\\\\\normalsize ${email} $\\vert$ ${phone}\\end{center}

\\textbf{Dear Hiring Manager,}

\\vspace{1em}
${cover.replaceAll("\n", "\n\n")}

\\vspace{1em}
\\textbf{Application for ${title} at ${company}}
\\end{document}
`,
  };
}

async function commandAvailable(command: string): Promise<boolean> {
  try {
    await execute("where.exe", [command], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(target: string, contents: string | Buffer): Promise<void> {
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, contents, { flag: "wx" });
  await rename(temporary, target);
}

function check(id: string, label: string, status: ReadinessCheck["status"], detail: string): ReadinessCheck {
  return { id, label, required: true, status, detail };
}

async function compile(tool: "lualatex" | "xelatex", filename: string, directory: string): Promise<void> {
  await execute(tool, ["-interaction=nonstopmode", "-halt-on-error", filename], {
    cwd: directory,
    windowsHide: true,
    timeout: 120_000,
  });
}

async function pdfPages(pdf: string): Promise<number> {
  const { stdout } = await execute("pdfinfo", [pdf], { windowsHide: true });
  const match = stdout.match(/^Pages:\s+(\d+)\s*$/m);
  if (!match) throw new Error("pdfinfo returned no page count.");
  return Number(match[1]);
}

export class DocumentService {
  private readonly dataRoot: string;

  constructor(dataRoot: string) {
    this.dataRoot = path.resolve(dataRoot);
  }

  async generate(application: ArchivedApplication, identity: DocumentIdentity, now = new Date()): Promise<DocumentReadiness> {
    const directory = path.resolve(this.dataRoot, "applications", application.id);
    await mkdir(directory, { recursive: true });
    const sources = renderDocumentSources(application, identity);
    const cvSource = path.join(directory, "cv.tex");
    const coverSource = path.join(directory, "cover-letter.tex");
    await atomicWrite(cvSource, sources.cv);
    await atomicWrite(coverSource, sources.cover);

    const artifacts: DocumentArtifactRecord[] = [
      { kind: "cv_source", relativePath: "cv.tex", mediaType: "application/x-tex" },
      { kind: "cover_letter_source", relativePath: "cover-letter.tex", mediaType: "application/x-tex" },
    ];
    const availability = Object.fromEntries(
      await Promise.all(REQUIRED_TOOLS.map(async (tool) => [tool, await commandAvailable(tool)])),
    ) as Record<(typeof REQUIRED_TOOLS)[number], boolean>;
    const checks: ReadinessCheck[] = [
      check("factual_review", "Every rendered claim is verified", "passed", `${verifiedClaims(application).length} verified claims rendered; pending and rejected claims excluded.`),
      check("contact_details", "Contact details are present in document sources", "passed", `${identity.fullName}, email, and phone were rendered as literal text.`),
      check("document_tools", "Required document tools are installed", Object.values(availability).every(Boolean) ? "passed" : "failed", `Required: ${REQUIRED_TOOLS.join(", ")}. Missing: ${REQUIRED_TOOLS.filter((tool) => !availability[tool]).join(", ") || "none"}.`),
    ];

    if (Object.values(availability).every(Boolean)) {
      try {
        await compile("lualatex", "cv.tex", directory);
        await compile("xelatex", "cover-letter.tex", directory);
        const cvPdf = path.join(directory, "cv.pdf");
        const coverPdf = path.join(directory, "cover-letter.pdf");
        artifacts.push(
          { kind: "cv_pdf", relativePath: "cv.pdf", mediaType: "application/pdf" },
          { kind: "cover_letter_pdf", relativePath: "cover-letter.pdf", mediaType: "application/pdf" },
        );
        const [cvPageCount, coverPageCount] = await Promise.all([pdfPages(cvPdf), pdfPages(coverPdf)]);
        checks.push(
          check("cv_pages", "CV is exactly two pages", cvPageCount === 2 ? "passed" : "failed", `Found ${cvPageCount} page(s).`),
          check("cover_pages", "Cover letter is exactly one page", coverPageCount === 1 ? "passed" : "failed", `Found ${coverPageCount} page(s).`),
        );
        const { stdout: atsText } = await execute("pdftotext", ["-layout", cvPdf, "-"], { windowsHide: true });
        await atomicWrite(path.join(directory, "cv-ats.txt"), atsText);
        artifacts.push({ kind: "ats_text", relativePath: "cv-ats.txt", mediaType: "text/plain" });
        const garbled = /\(cid:\d+\)|�/.test(atsText);
        const contactPresent = atsText.includes(identity.email) && atsText.includes(identity.phone);
        const keywordsPresent = application.draft.matchedKeywords.every((keyword) => atsText.toLowerCase().includes(keyword.toLowerCase()));
        checks.push(
          check("ats_text", "CV has a clean ATS text layer", atsText.trim().length >= 100 && !garbled ? "passed" : "failed", garbled ? "Garbled glyph markers were detected." : `${atsText.trim().length} text characters extracted.`),
          check("ats_contact", "Email and phone survive ATS extraction", contactPresent ? "passed" : "failed", contactPresent ? "Both contact fields appear as literal text." : "Email or phone is missing from the extracted text."),
          check("ats_keywords", "Supported posting keywords survive PDF extraction", keywordsPresent ? "passed" : "failed", keywordsPresent ? "All supported keywords were found." : "One or more supported keywords are missing from extracted text."),
        );
      } catch (error) {
        checks.push(check("compile", "Both documents compile successfully", "failed", error instanceof Error ? error.message.slice(0, 1_500) : "Compilation failed."));
      } finally {
        await Promise.all(["cv.aux", "cv.log", "cv.out", "cover-letter.aux", "cover-letter.log", "cover-letter.out"].map(async (file) => {
          try { await unlink(path.join(directory, file)); } catch {}
        }));
      }
    } else {
      checks.push(
        check("cv_pages", "CV is exactly two pages", "pending", "Install the required tools to compile and inspect the CV."),
        check("cover_pages", "Cover letter is exactly one page", "pending", "Install the required tools to compile and inspect the cover letter."),
        check("ats_text", "CV has a clean ATS text layer", "pending", "Install Poppler to extract and inspect the PDF text layer."),
        check("ats_contact", "Email and phone survive ATS extraction", "pending", "Compile and extract the CV before checking contact fields."),
        check("ats_keywords", "Supported posting keywords survive PDF extraction", "pending", "Compile and extract the CV before checking keyword survival."),
      );
    }
    checks.push(check("visual_review", "Both PDFs pass human visual inspection", "pending", "Open both PDFs and confirm layout, page breaks, signature, and typography."));

    const ready = checks.filter((item) => item.required).every((item) => item.status === "passed");
    const manifest = documentReadinessSchema.parse({
      schemaVersion: 1,
      applicationId: application.id,
      applicationRevision: application.revision,
      status: ready ? "ready" : "blocked",
      artifacts,
      checks,
      generatedAt: now.toISOString(),
    });
    await atomicWrite(path.join(directory, "readiness.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
  }

  async load(applicationId: string): Promise<DocumentReadiness | null> {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(applicationId)) throw new Error("Invalid application ID.");
    try {
      const target = path.resolve(this.dataRoot, "applications", applicationId, "readiness.json");
      return documentReadinessSchema.parse(JSON.parse(await readFile(target, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async confirmVisualReview(applicationId: string, applicationRevision: number, now = new Date()): Promise<DocumentReadiness> {
    const current = await this.load(applicationId);
    if (!current) throw new Error("Document readiness record not found.");
    if (current.applicationRevision !== applicationRevision) throw new Error("Application changed; regenerate documents before visual review.");
    if (!current.artifacts.some((artifact) => artifact.kind === "cv_pdf")
      || !current.artifacts.some((artifact) => artifact.kind === "cover_letter_pdf")) {
      throw new Error("Both PDFs must exist before visual review can pass.");
    }
    if (current.checks.some((item) => item.required && item.id !== "visual_review" && item.status !== "passed")) {
      throw new Error("Resolve all mechanical document checks before confirming visual review.");
    }
    const checks = current.checks.map((item) => item.id === "visual_review"
      ? { ...item, status: "passed" as const, detail: "User confirmed both rendered PDFs after visual inspection." }
      : item);
    const next = documentReadinessSchema.parse({
      ...current,
      status: "ready",
      checks,
      generatedAt: now.toISOString(),
    });
    const target = path.resolve(this.dataRoot, "applications", applicationId, "readiness.json");
    await atomicWrite(target, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }
}
