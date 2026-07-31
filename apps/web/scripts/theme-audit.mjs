import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { archivedApplicationSchema, canonicalCareerProfileSchema, documentThemes } from "../../../packages/career-core/dist/index.js";
import { renderDesignedCoverLetterHtml } from "../src/server/documents/cover-letter-renderer.ts";
import { renderDesignedResumeHtml } from "../src/server/documents/html-resume-renderer.ts";
import { renderDesignedPdf } from "../src/server/documents/resume-export-service.ts";
import { buildStructuredResume } from "../src/server/documents/structured-resume-service.ts";

const applicationId = process.argv[2];
const outputRoot = path.resolve(process.argv[3] || path.join("..", "..", "career-data", "theme-audit"));
if (!applicationId) throw new Error("Usage: npm run audit:themes -- <application-id> [output-directory]");

const dataRoot = path.resolve("..", "..", "career-data");
const application = archivedApplicationSchema.parse(JSON.parse(await readFile(path.join(dataRoot, "applications", `${applicationId}.json`), "utf8")));
const profile = canonicalCareerProfileSchema.parse(JSON.parse(await readFile(path.join(dataRoot, "canonical-career.json"), "utf8")));
const identity = {
  fullName: "Candidate Name",
  email: "candidate@example.com",
  phone: "(201) 555-0100",
};

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({
  executablePath: path.resolve(process.env.PRO_FLOW_CHROME_PATH?.trim() || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"),
  headless: true,
});
const contactSheetItems = [];
for (const theme of documentThemes) {
  const structured = buildStructuredResume(application, profile, identity, theme.id);
  const resumeHtml = renderDesignedResumeHtml(structured);
  const coverHtml = renderDesignedCoverLetterHtml(structured, application.draft.coverLetter);
  const themeDirectory = path.join(outputRoot, theme.id);
  await mkdir(themeDirectory, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 1 });
  await page.setContent(resumeHtml, { waitUntil: "load" });
  const resumePreview = await page.screenshot({ fullPage: true });
  await page.setContent(coverHtml, { waitUntil: "load" });
  const coverPreview = await page.screenshot({ fullPage: true });
  contactSheetItems.push(
    { type: "resume", label: `${theme.name} resume`, image: resumePreview.toString("base64") },
    { type: "cover", label: `${theme.name} cover letter`, image: coverPreview.toString("base64") },
  );
  await page.close();
  await Promise.all([
    writeFile(path.join(themeDirectory, "resume.html"), resumeHtml),
    writeFile(path.join(themeDirectory, "cover-letter.html"), coverHtml),
    renderDesignedPdf(resumeHtml).then((value) => writeFile(path.join(themeDirectory, "resume.pdf"), value)),
    renderDesignedPdf(coverHtml).then((value) => writeFile(path.join(themeDirectory, "cover-letter.pdf"), value)),
    writeFile(path.join(themeDirectory, "resume-preview.png"), resumePreview),
    writeFile(path.join(themeDirectory, "cover-preview.png"), coverPreview),
  ]);
}
for (const type of ["resume", "cover"]) {
  const items = contactSheetItems.filter((item) => item.type === type);
  const contactPage = await browser.newPage({ viewport: { width: 1900, height: 900 }, deviceScaleFactor: 1 });
  await contactPage.setContent(`<!doctype html><style>body{margin:0;padding:20px;background:#dfe3e8;font-family:Arial}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}.item{background:white;padding:10px;box-shadow:0 4px 18px #0002}.item h2{font-size:15px;margin:0 0 8px}.item img{display:block;width:100%;height:760px;object-fit:contain;object-position:top;background:#f4f5f6}</style><div class="grid">${items.map((item) => `<div class="item"><h2>${item.label}</h2><img src="data:image/png;base64,${item.image}"></div>`).join("")}</div>`, { waitUntil: "load" });
  await writeFile(path.join(outputRoot, `${type}-contact-sheet.png`), await contactPage.screenshot({ fullPage: true }));
  await contactPage.close();
}
await browser.close();
console.log(`Rendered ${documentThemes.length} themes to ${outputRoot}`);
