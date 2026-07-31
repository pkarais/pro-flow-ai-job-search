import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import {
  documentReadinessSchema,
  effectiveEvidenceValue,
  type ArchivedApplication,
  type CanonicalCareerProfile,
  type DocumentIdentity,
  type DocumentPalette,
  type DocumentArtifactRecord,
  type DocumentReadiness,
  type DocumentThemeId,
  type ReadinessCheck,
} from "@pro-flow/career-core";
import { renderDesignedResumeHtml } from "./html-resume-renderer.ts";
import { renderDesignedCoverLetterHtml } from "./cover-letter-renderer.ts";
import { renderCoverLetterDocx, renderDesignedPdf, renderResumeDocx } from "./resume-export-service.ts";
import { buildStructuredResume } from "./structured-resume-service.ts";
import { formatUsPhone } from "./phone-format.ts";

const execute = promisify(execFile);
const REQUIRED_TOOLS = ["lualatex", "xelatex", "pdfinfo", "pdftotext"] as const;
type RequiredTool = (typeof REQUIRED_TOOLS)[number];
type ResolvedTools = Record<RequiredTool, string | null>;
type ToolResolver = (command: RequiredTool) => Promise<string | null>;
const TOOL_ENVIRONMENT: Record<RequiredTool, string> = {
  lualatex: "PRO_FLOW_LUALATEX_PATH",
  xelatex: "PRO_FLOW_XELATEX_PATH",
  pdfinfo: "PRO_FLOW_PDFINFO_PATH",
  pdftotext: "PRO_FLOW_PDFTOTEXT_PATH",
};

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

function resumeClaimsForAts(application: ArchivedApplication): string[] {
  return verifiedClaims(application)
    .filter((claim) => !claim.kind || claim.kind === "resume_bullet")
    .map((claim) => claim.text);
}

function normalizeDisplayText(value: string): string {
  return value
    .replaceAll("â€”", " - ")
    .replaceAll("â€“", "-")
    .replaceAll("â€™", "'")
    .replaceAll("â€œ", "\"")
    .replaceAll("â€", "\"")
    .replaceAll("—", " - ")
    .replaceAll("–", "-")
    .replaceAll("’", "'")
    .replaceAll("“", "\"")
    .replaceAll("”", "\"")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function cleanRoleTitle(value: string): string {
  return normalizeDisplayText(value).replace(/\s*[-–—]\s*job post.*$/i, "").trim();
}

function careerRecord(profile: CanonicalCareerProfile | undefined, id: string) {
  const record = profile?.records.find((item) => item.id === id);
  const value = record ? effectiveEvidenceValue(record) : null;
  return value && record ? { ...record, value: normalizeDisplayText(value) } : null;
}

function renderCareerContext(
  profile: CanonicalCareerProfile | undefined,
  postingText: string,
  theme: ThemeStyle,
): string {
  if (!profile) return "";
  const current = careerRecord(profile, "verified_career_history_001");
  const earlier = ["verified_career_history_018", "verified_career_history_019", "verified_career_history_020"]
    .map((id) => careerRecord(profile, id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const education = careerRecord(profile, "education_credentials_001");
  const capabilityRecords = ["skills_001", "skills_002", "skills_003"]
    .map((id) => careerRecord(profile, id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const posting = postingText.toLowerCase();
  const rankedCapabilityRecords = capabilityRecords.map((item) => ({
    item,
    relevance: item.value.toLowerCase().split(/\W+/).filter((word) => word.length > 4 && posting.includes(word)).length,
  })).sort((left, right) => right.relevance - left.relevance);
  const capabilities = rankedCapabilityRecords
    .slice(0, 2)
    .map(({ item }) => item)
    .flatMap((item) => item.value.split(";").map((value) => value.trim()))
    .filter(Boolean)
    .map((value) => ({
      value: value.replace(/[.;]+$/, ""),
      relevance: value.toLowerCase().split(/\W+/).filter((word) => word.length > 4 && posting.includes(word)).length,
    }))
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, 16)
    .map((item) => item.value);

  const currentMatch = current?.value.match(/^Title:\s*(.*?)\s+Location:\s*(.*?)\s+Dates:\s*(.*)$/i);
  const currentHeader = current && currentMatch
    ? `\\textbf{${escapeLatex(currentMatch[1])}} \\hfill ${escapeLatex(currentMatch[3])}\\\\\n${escapeLatex(current.sourceSection || "Current facilities leadership role")} $\\vert$ ${escapeLatex(currentMatch[2])}\n%CURRENT_BULLETS%`
    : "";
  const earlierEntries = earlier.map((item) => {
    const parts = item.value.split(/\s+-\s+/);
    if (parts.length < 3) return `\\textbf{${escapeLatex(item.value)}}`;
    return `\\textbf{${escapeLatex(parts[1])}} \\hfill ${escapeLatex(parts.slice(2).join(" - ").replace(/[.;]+$/, ""))}\\\\\n${escapeLatex(parts[0])}`;
  }).join("\n\n");
  const secondaryExpertise = rankedCapabilityRecords.find(({ item }) => item.id !== "skills_001")?.item.value;
  const educationText = education
    ? escapeLatex(education.value.replace(/^Plaza College:\s*/i, "Plaza College - "))
    : "";

  return [
    capabilities.length ? `\\themesection{${theme.expertiseLabel}}\n${escapeLatex(capabilities.join("; "))}` : "",
    currentHeader ? `\\themesection{Professional experience}\n${currentHeader}` : "",
    earlierEntries ? `\\newpage\n\\themesection{Earlier career}\n${earlierEntries}` : "",
    secondaryExpertise ? `\\themesection{${theme.secondaryLabel}}\n${escapeLatex(secondaryExpertise)}` : "",
    educationText ? `\\themesection{Education}\n${educationText}` : "",
  ].filter(Boolean).join("\n");
}

type ThemeStyle = {
  accent: string;
  margin: string;
  heading: string;
  nameSize: string;
  sectionRule: string;
  headerAlignment: "center" | "flushleft";
  coverAlignment: "center" | "flushleft";
  profileLabel: string;
  expertiseLabel: string;
  secondaryLabel: string;
  itemSpacing: string;
};

const THEME_STYLES: Record<DocumentThemeId, ThemeStyle> = {
  executive: { accent: "243B53", margin: "0.82in", heading: "\\large\\bfseries", nameSize: "\\LARGE", sectionRule: "\\vspace{-0.55em}\\noindent\\color{ThemeAccent}\\rule{\\linewidth}{0.8pt}\\color{black}\\vspace{0.2em}", headerAlignment: "flushleft", coverAlignment: "flushleft", profileLabel: "Executive profile", expertiseLabel: "Leadership expertise", secondaryLabel: "Technical foundation", itemSpacing: "0.3em" },
  technical: { accent: "176B87", margin: "0.78in", heading: "\\large\\bfseries", nameSize: "\\LARGE", sectionRule: "\\vspace{-0.5em}\\noindent\\color{ThemeAccent}\\rule{\\linewidth}{0.45pt}\\color{black}\\vspace{0.2em}", headerAlignment: "flushleft", coverAlignment: "flushleft", profileLabel: "Technical profile", expertiseLabel: "Core capabilities", secondaryLabel: "Technical toolkit", itemSpacing: "0.2em" },
  ats_classic: { accent: "000000", margin: "0.85in", heading: "\\large\\bfseries", nameSize: "\\LARGE", sectionRule: "\\vspace{-0.55em}\\noindent\\rule{\\linewidth}{0.4pt}\\vspace{0.2em}", headerAlignment: "center", coverAlignment: "flushleft", profileLabel: "Professional summary", expertiseLabel: "Core competencies", secondaryLabel: "Additional expertise", itemSpacing: "0.25em" },
  government: { accent: "1F3A5F", margin: "0.75in", heading: "\\normalsize\\bfseries", nameSize: "\\Large", sectionRule: "\\vspace{-0.5em}\\noindent\\color{ThemeAccent}\\rule{\\linewidth}{1pt}\\color{black}\\vspace{0.15em}", headerAlignment: "flushleft", coverAlignment: "flushleft", profileLabel: "Professional summary", expertiseLabel: "Qualifications", secondaryLabel: "Operational and technical knowledge", itemSpacing: "0.25em" },
  modern: { accent: "5B4B73", margin: "0.8in", heading: "\\large\\bfseries", nameSize: "\\LARGE", sectionRule: "\\vspace{-0.55em}\\noindent\\color{ThemeAccent}\\rule{0.28\\linewidth}{1.5pt}\\color{black}\\vspace{0.2em}", headerAlignment: "center", coverAlignment: "center", profileLabel: "Professional profile", expertiseLabel: "Areas of impact", secondaryLabel: "Systems and domain expertise", itemSpacing: "0.35em" },
};
const ART_DIRECTION_ACCENTS = {
  navy: "17324D",
  teal: "006D77",
  plum: "5A3F75",
  slate: "394B59",
  forest: "285943",
  burgundy: "7A263A",
} as const;

function latexPreamble(theme: ThemeStyle, emptyPageStyle = false): string {
  return `\\usepackage[margin=${theme.margin}]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{xcolor}
\\definecolor{ThemeAccent}{HTML}{${theme.accent}}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.55em}
${emptyPageStyle ? "\\pagestyle{empty}" : "\\pagestyle{plain}"}
\\newcommand{\\themesection}[1]{\\vspace{0.65em}{${theme.heading}\\color{ThemeAccent} #1}\\par${theme.sectionRule}}`;
}

export function renderDocumentSources(
  application: ArchivedApplication,
  identity: DocumentIdentity,
  themeId: DocumentThemeId = "ats_classic",
  profile?: CanonicalCareerProfile,
  paletteOverride?: DocumentPalette,
): { cv: string; cover: string } {
  const claims = verifiedClaims(application);
  if (application.status !== "review_complete" || claims.length === 0) {
    throw new Error("Complete factual review and verify at least one claim before rendering documents.");
  }
  if (
    application.draft.generation?.method === "ai"
    && application.draft.claims.some((claim) => claim.decision === "do_not_use")
  ) {
    throw new Error("Regenerate the AI draft after rejecting a claim so excluded language cannot remain in the final documents.");
  }
  const title = escapeLatex(cleanRoleTitle(application.opportunity.positionTitle));
  const fullName = escapeLatex(identity.fullName);
  const email = escapeLatex(identity.email);
  const phone = escapeLatex(formatUsPhone(identity.phone));
  const resumeClaims = claims.filter((claim) => !claim.kind || claim.kind === "resume_bullet");
  const items = resumeClaims.map((claim) => `\\item ${escapeLatex(normalizeDisplayText(claim.text))}`).join("\n");
  const summary = escapeLatex(normalizeDisplayText(application.draft.summary));
  const cover = escapeLatex(normalizeDisplayText(application.draft.coverLetter))
    .replace("[Your name]", fullName);
  const visualDirection = application.draft.generation?.visualDirection;
  const theme = visualDirection && themeId !== "ats_classic"
    ? { ...THEME_STYLES[themeId], accent: ART_DIRECTION_ACCENTS[paletteOverride ?? visualDirection.palette] }
    : paletteOverride && themeId !== "ats_classic"
      ? { ...THEME_STYLES[themeId], accent: ART_DIRECTION_ACCENTS[paletteOverride] }
    : THEME_STYLES[themeId];
  const careerContext = renderCareerContext(
    profile,
    `${application.opportunity.positionTitle}\n${application.opportunity.description}`,
    theme,
  );
  const leadershipItems = items ? `\\begin{itemize}[leftmargin=*,itemsep=${theme.itemSpacing},topsep=0.35em]\n${items}\n\\end{itemize}` : "";
  const experienceContent = careerContext
    ? careerContext.replace("%CURRENT_BULLETS%", leadershipItems)
    : `\\themesection{Selected leadership contributions}\n${leadershipItems}`;
  return {
    cv: `\\documentclass[11pt,a4paper]{article}
${latexPreamble(theme, true)}
\\usepackage{enumitem}
\\begin{document}
\\begin{${theme.headerAlignment}}{${theme.nameSize}\\bfseries\\color{ThemeAccent} ${fullName}}\\\\[0.25em]\\normalsize\\color{black} ${email} $\\vert$ ${phone}\\\\[0.35em]\\large ${title}\\end{${theme.headerAlignment}}
\\themesection{${theme.profileLabel}}
${summary}
${experienceContent}
\\end{document}
`,
    cover: `\\documentclass[11pt,a4paper]{article}
${latexPreamble(theme, true)}
\\begin{document}
\\begin{flushright}\\color{ThemeAccent}\\today\\end{flushright}
\\begin{${theme.coverAlignment}}{${theme.nameSize}\\bfseries\\color{ThemeAccent} ${fullName}}\\\\[0.25em]\\normalsize\\color{black} ${email} $\\vert$ ${phone}\\end{${theme.coverAlignment}}
${theme.sectionRule}

${cover.replaceAll("\n", "\n\n")}
\\end{document}
`,
  };
}

async function resolveTool(command: RequiredTool): Promise<string | null> {
  const configured = process.env[TOOL_ENVIRONMENT[command]]?.trim();
  if (configured) {
    const resolved = path.resolve(configured);
    if (path.basename(resolved).toLowerCase() !== `${command}.exe`) {
      throw new Error(`${TOOL_ENVIRONMENT[command]} must point to ${command}.exe.`);
    }
    try {
      const details = await stat(resolved);
      if (details.isFile()) return resolved;
    } catch {}
    throw new Error(`${TOOL_ENVIRONMENT[command]} points to a missing executable.`);
  }
  try {
    const { stdout } = await execute("where.exe", [command], { windowsHide: true });
    return stdout.split(/\r?\n/).map((item) => item.trim()).find(Boolean) ?? null;
  } catch {
    return null;
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

async function compile(tool: string, filename: string, directory: string): Promise<void> {
  await execute(tool, ["-interaction=nonstopmode", "-halt-on-error", filename], {
    cwd: directory,
    windowsHide: true,
    timeout: 120_000,
  });
}

async function executeWithInput(tool: string, args: string[], input: Buffer): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(tool, args, { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timer = setTimeout(() => child.kill(), 120_000);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) resolve(result);
      else reject(new Error(`${path.basename(tool)} exited with code ${code}: ${result.stderr || result.stdout}`));
    });
    child.stdin.end(input);
  });
}

async function pdfPages(pdf: string, pdfinfo: string): Promise<number> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const handle = await open(pdf, "r");
      await handle.close();
      const details = await stat(pdf);
      if (details.size === 0) throw new Error("Generated PDF is empty.");
      const { stdout } = await executeWithInput(pdfinfo, ["-"], await readFile(pdf));
      const match = stdout.match(/^Pages:\s+(\d+)\s*$/m);
      if (!match) throw new Error("pdfinfo returned no page count.");
      return Number(match[1]);
    } catch (error) {
      lastError = error;
      if (attempt < 6) await delay(attempt * 150);
    }
  }
  throw new Error(`Generated PDF did not become readable after bounded retries: ${lastError instanceof Error ? lastError.message : "unknown file error"}`);
}

export class DocumentService {
  private readonly dataRoot: string;
  private readonly toolResolver: ToolResolver;

  constructor(dataRoot: string, toolResolver: ToolResolver = resolveTool) {
    this.dataRoot = path.resolve(dataRoot);
    this.toolResolver = toolResolver;
  }

  async generate(
    application: ArchivedApplication,
    identity: DocumentIdentity,
    themeId: DocumentThemeId,
    now = new Date(),
    profile?: CanonicalCareerProfile,
    paletteOverride?: DocumentPalette,
  ): Promise<DocumentReadiness> {
    const directory = path.resolve(this.dataRoot, "applications", application.id);
    await mkdir(directory, { recursive: true });
    const sources = renderDocumentSources(application, identity, themeId, profile, paletteOverride);
    const cvSource = path.join(directory, "cv.tex");
    const coverSource = path.join(directory, "cover-letter.tex");
    await atomicWrite(cvSource, sources.cv);
    await atomicWrite(coverSource, sources.cover);

    const artifacts: DocumentArtifactRecord[] = [
      { kind: "cv_source", relativePath: "cv.tex", mediaType: "application/x-tex" },
      { kind: "cover_letter_source", relativePath: "cover-letter.tex", mediaType: "application/x-tex" },
    ];
    let designedExportError: string | null = null;
    if (profile) {
      try {
        const structured = buildStructuredResume(application, profile, identity, themeId, paletteOverride);
        const designedHtml = renderDesignedResumeHtml(structured);
        const designedCoverHtml = renderDesignedCoverLetterHtml(structured, application.draft.coverLetter);
        const [designedPdf, resumeDocx, designedCoverPdf, coverLetterDocx] = await Promise.all([
          renderDesignedPdf(designedHtml),
          renderResumeDocx(structured),
          renderDesignedPdf(designedCoverHtml),
          renderCoverLetterDocx(structured, application.draft.coverLetter),
        ]);
        await Promise.all([
          atomicWrite(path.join(directory, "designed-resume.html"), designedHtml),
          atomicWrite(path.join(directory, "designed-resume.pdf"), designedPdf),
          atomicWrite(path.join(directory, "resume.docx"), resumeDocx),
          atomicWrite(path.join(directory, "designed-cover-letter.html"), designedCoverHtml),
          atomicWrite(path.join(directory, "designed-cover-letter.pdf"), designedCoverPdf),
          atomicWrite(path.join(directory, "cover-letter.docx"), coverLetterDocx),
        ]);
        artifacts.push(
          { kind: "designed_resume_html", relativePath: "designed-resume.html", mediaType: "text/html" },
          { kind: "designed_resume_pdf", relativePath: "designed-resume.pdf", mediaType: "application/pdf" },
          { kind: "resume_docx", relativePath: "resume.docx", mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
          { kind: "designed_cover_letter_html", relativePath: "designed-cover-letter.html", mediaType: "text/html" },
          { kind: "designed_cover_letter_pdf", relativePath: "designed-cover-letter.pdf", mediaType: "application/pdf" },
          { kind: "cover_letter_docx", relativePath: "cover-letter.docx", mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
        );
      } catch (error) {
        designedExportError = error instanceof Error ? error.message.slice(0, 1_500) : "Designed export failed.";
      }
    }
    const tools = Object.fromEntries(
      await Promise.all(REQUIRED_TOOLS.map(async (tool) => [tool, await this.toolResolver(tool)])),
    ) as ResolvedTools;
    const availability = Object.fromEntries(
      REQUIRED_TOOLS.map((tool) => [tool, Boolean(tools[tool])]),
    ) as Record<RequiredTool, boolean>;
    const checks: ReadinessCheck[] = [
      check("factual_review", "Every rendered claim is verified", "passed", `${verifiedClaims(application).length} verified claims rendered; pending and rejected claims excluded.`),
      check("contact_details", "Contact details are present in document sources", "passed", `${identity.fullName}, email, and phone were rendered as literal text.`),
      check("document_theme", "Selected document theme is recorded", "passed", `${themeId} was applied to both documents and stored with this readiness record.`),
      check("designed_exports", "Coordinated résumé and cover-letter exports are generated", profile && !designedExportError ? "passed" : profile ? "failed" : "pending", profile ? designedExportError || "The live HTML pages, designed PDFs, and editable DOCX files share one structured résumé, palette, and typography system." : "Canonical profile context is required."),
      check("document_tools", "Required document tools are installed", Object.values(availability).every(Boolean) ? "passed" : "failed", `Required: ${REQUIRED_TOOLS.join(", ")}. Missing: ${REQUIRED_TOOLS.filter((tool) => !availability[tool]).join(", ") || "none"}.`),
    ];

    if (Object.values(availability).every(Boolean)) {
      let compiled = false;
      try {
        await compile(tools.lualatex!, "cv.tex", directory);
        await compile(tools.xelatex!, "cover-letter.tex", directory);
        compiled = true;
        checks.push(check("compile", "Both documents compile successfully", "passed", "LaTeX created both document outputs without reporting an error."));
        const cvPdf = path.join(directory, "cv.pdf");
        const coverPdf = path.join(directory, "cover-letter.pdf");
        const [cvPageCount, coverPageCount] = await Promise.all([
          pdfPages(cvPdf, tools.pdfinfo!),
          pdfPages(coverPdf, tools.pdfinfo!),
        ]);
        artifacts.push(
          { kind: "cv_pdf", relativePath: "cv.pdf", mediaType: "application/pdf" },
          { kind: "cover_letter_pdf", relativePath: "cover-letter.pdf", mediaType: "application/pdf" },
        );
        checks.push(
          check("cv_pages", "CV is exactly two pages", cvPageCount === 2 ? "passed" : "failed", `Found ${cvPageCount} page(s).`),
          check("cover_pages", "Cover letter is exactly one page", coverPageCount === 1 ? "passed" : "failed", `Found ${coverPageCount} page(s).`),
        );
        const { stdout: atsText } = await executeWithInput(
          tools.pdftotext!,
          ["-layout", "-", "-"],
          await readFile(cvPdf),
        );
        await atomicWrite(path.join(directory, "cv-ats.txt"), atsText);
        artifacts.push({ kind: "ats_text", relativePath: "cv-ats.txt", mediaType: "text/plain" });
        const garbled = /\(cid:\d+\)|�/.test(atsText);
        const formattedPhone = formatUsPhone(identity.phone);
        const contactPresent = atsText.includes(identity.email) && atsText.includes(formattedPhone);
        const renderedEmployerText = [
          application.draft.summary,
          ...resumeClaimsForAts(application),
        ].join(" ").toLowerCase();
        const expectedKeywords = application.draft.matchedKeywords
          .filter((keyword) => renderedEmployerText.includes(keyword.toLowerCase()));
        const missingKeywords = expectedKeywords
          .filter((keyword) => !atsText.toLowerCase().includes(keyword.toLowerCase()));
        const keywordsPresent = missingKeywords.length === 0;
        checks.push(
          check("ats_text", "CV has a clean ATS text layer", atsText.trim().length >= 100 && !garbled ? "passed" : "failed", garbled ? "Garbled glyph markers were detected." : `${atsText.trim().length} text characters extracted.`),
          check("ats_contact", "Email and phone survive ATS extraction", contactPresent ? "passed" : "failed", contactPresent ? "Both contact fields appear as literal text." : "Email or phone is missing from the extracted text."),
          check("ats_keywords", "Rendered posting keywords survive PDF extraction", keywordsPresent ? "passed" : "failed", keywordsPresent ? `${expectedKeywords.length} rendered posting keyword(s) survived extraction.` : `Missing after extraction: ${missingKeywords.join(", ")}.`),
        );
        const designedPdf = path.join(directory, "designed-resume.pdf");
        const designedCoverPdf = path.join(directory, "designed-cover-letter.pdf");
        if (profile && !designedExportError) {
          const [designedPages, designedTextResult, designedCoverPages, designedCoverTextResult] = await Promise.all([
            pdfPages(designedPdf, tools.pdfinfo!),
            executeWithInput(tools.pdftotext!, ["-layout", "-", "-"], await readFile(designedPdf)),
            pdfPages(designedCoverPdf, tools.pdfinfo!),
            executeWithInput(tools.pdftotext!, ["-layout", "-", "-"], await readFile(designedCoverPdf)),
          ]);
          const designedText = designedTextResult.stdout;
          const designedCoverText = designedCoverTextResult.stdout;
          const designedContact = designedText.includes(identity.email) && designedText.includes(formattedPhone);
          const designedCoverContact = designedCoverText.includes(identity.email) && designedCoverText.includes(formattedPhone);
          checks.push(
            check("designed_pages", "Designed resume is one or two pages", designedPages >= 1 && designedPages <= 2 ? "passed" : "failed", `Found ${designedPages} page(s).`),
            check("designed_text", "Designed resume has an extractable text layer", designedText.trim().length >= 100 ? "passed" : "failed", `${designedText.trim().length} text characters extracted.`),
            check("designed_contact", "Contact details survive designed PDF extraction", designedContact ? "passed" : "failed", designedContact ? "Both contact fields appear as literal text." : "Email or phone is missing from the designed PDF text."),
            check("designed_cover_pages", "Designed cover letter is exactly one page", designedCoverPages === 1 ? "passed" : "failed", `Found ${designedCoverPages} page(s).`),
            check("designed_cover_text", "Designed cover letter has an extractable text layer", designedCoverText.trim().length >= 100 ? "passed" : "failed", `${designedCoverText.trim().length} text characters extracted.`),
            check("designed_cover_contact", "Contact details survive designed cover-letter extraction", designedCoverContact ? "passed" : "failed", designedCoverContact ? "Both contact fields appear as literal text." : "Email or phone is missing from the designed cover-letter PDF text."),
          );
        } else {
          checks.push(
            check("designed_pages", "Designed resume is one or two pages", "failed", designedExportError || "Designed PDF was not generated."),
            check("designed_text", "Designed resume has an extractable text layer", "failed", designedExportError || "Designed PDF was not generated."),
            check("designed_contact", "Contact details survive designed PDF extraction", "failed", designedExportError || "Designed PDF was not generated."),
            check("designed_cover_pages", "Designed cover letter is exactly one page", "failed", designedExportError || "Designed cover-letter PDF was not generated."),
            check("designed_cover_text", "Designed cover letter has an extractable text layer", "failed", designedExportError || "Designed cover-letter PDF was not generated."),
            check("designed_cover_contact", "Contact details survive designed cover-letter extraction", "failed", designedExportError || "Designed cover-letter PDF was not generated."),
          );
        }
      } catch (error) {
        checks.push(check(
          compiled ? "pdf_inspection" : "compile",
          compiled ? "Generated PDFs pass mechanical inspection" : "Both documents compile successfully",
          "failed",
          error instanceof Error ? error.message.slice(0, 1_500) : compiled ? "PDF inspection failed." : "Compilation failed.",
        ));
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
    checks.push(check("visual_review", "All employer-facing PDFs pass human visual inspection", "pending", "Open the ATS resume, designed resume, and designed cover letter PDFs; confirm layout, page breaks, contact details, signature, and typography."));

    const ready = checks.filter((item) => item.required).every((item) => item.status === "passed");
    const manifest = documentReadinessSchema.parse({
      schemaVersion: 2,
      applicationId: application.id,
      applicationRevision: application.revision,
      themeId,
      paletteId: paletteOverride,
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
      || !current.artifacts.some((artifact) => artifact.kind === "cover_letter_pdf")
      || !current.artifacts.some((artifact) => artifact.kind === "designed_resume_pdf")
      || !current.artifacts.some((artifact) => artifact.kind === "designed_cover_letter_pdf")) {
      throw new Error("All employer-facing PDFs must exist before visual review can pass.");
    }
    if (current.checks.some((item) => item.required && item.id !== "visual_review" && item.status !== "passed")) {
      throw new Error("Resolve all mechanical document checks before confirming visual review.");
    }
    const checks = current.checks.map((item) => item.id === "visual_review"
      ? { ...item, status: "passed" as const, detail: "User confirmed all employer-facing PDFs after visual inspection." }
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
