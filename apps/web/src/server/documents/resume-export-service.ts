import { access } from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { chromium } from "playwright-core";
import type { StructuredResume } from "@pro-flow/career-core";
import { formatUsPhone } from "./phone-format.ts";

const DOCX_PALETTES = {
  navy: "17324D",
  teal: "006D77",
  plum: "5A3F75",
  slate: "394B59",
  forest: "285943",
  burgundy: "7A263A",
} as const;

function docxAccent(resume: StructuredResume) {
  return DOCX_PALETTES[resume.artDirection.palette as keyof typeof DOCX_PALETTES] || "17324D";
}

export async function renderDesignedPdf(html: string): Promise<Buffer> {
  const executablePath = path.resolve(process.env.PRO_FLOW_CHROME_PATH?.trim() || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
  if (path.basename(executablePath).toLowerCase() !== "chrome.exe") {
    throw new Error("PRO_FLOW_CHROME_PATH must point to chrome.exe.");
  }
  await access(executablePath);
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    return Buffer.from(await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    }));
  } finally {
    await browser.close();
  }
}

export async function renderResumeDocx(resume: StructuredResume): Promise<Buffer> {
  const accent = docxAccent(resume);
  const section = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    border: { bottom: { color: accent, style: BorderStyle.SINGLE, size: 8, space: 4 } },
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: accent, size: 20 })],
  });
  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: resume.identity.fullName, bold: true, color: accent, size: 34 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: resume.targetTitle, bold: true, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`${resume.identity.email} | ${formatUsPhone(resume.identity.phone)}`)] }),
    section("Professional profile"),
    new Paragraph(resume.summary),
    section("Core expertise"),
    new Paragraph(resume.expertise.join(" | ")),
    section("Professional experience"),
  ];
  for (const role of resume.experience) {
    children.push(
      new Paragraph({
        spacing: { before: 180, after: 30 },
        children: [
          new TextRun({ text: role.title, bold: true, size: 22 }),
          new TextRun({ text: `\t${role.dates}`, bold: true }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: `${role.employer}${role.location ? ` | ${role.location}` : ""}`, italics: true })] }),
      ...role.highlights.map((item) => new Paragraph({ text: item, bullet: { level: 0 }, spacing: { after: 70 } })),
    );
  }
  if (resume.secondaryExpertise.length) {
    children.push(section("Additional capabilities"), new Paragraph(resume.secondaryExpertise.join("; ")));
  }
  if (resume.education.length) {
    children.push(section("Education"), ...resume.education.map((item) => new Paragraph(item)));
  }
  const document = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 800, bottom: 720, left: 800 },
        },
      },
      children,
    }],
  });
  return Packer.toBuffer(document);
}

export async function renderCoverLetterDocx(resume: StructuredResume, letter: string, signatureDataUri?: string | null): Promise<Buffer> {
  const accent = docxAccent(resume);
  const paragraphs = letter.split(/\n\s*\n/).map((item) => item.trim())
    .filter((item) => item && !/^dear hiring manager,?$/i.test(item) && !/^sincerely,?$/i.test(item) && item !== "[Your name]");
  const signature = signatureDataUri?.match(/^data:image\/png;base64,(.+)$/)?.[1];
  const document = new Document({
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 900, right: 950, bottom: 900, left: 950 } } },
      children: [
        new Paragraph({ children: [new TextRun({ text: resume.identity.fullName, bold: true, color: accent, size: 32 })] }),
        new Paragraph(`${resume.identity.email} | ${formatUsPhone(resume.identity.phone)}`),
        new Paragraph({ spacing: { before: 300 }, border: { bottom: { color: accent, style: BorderStyle.SINGLE, size: 8, space: 4 } }, children: [new TextRun({ text: resume.targetPositioning.employer, bold: true, color: accent })] }),
        new Paragraph(resume.targetPositioning.location),
        new Paragraph({ text: "Dear Hiring Manager,", spacing: { before: 240 } }),
        ...paragraphs.map((item) => new Paragraph({ text: item.replace("[Your name]", resume.identity.fullName), spacing: { before: 160 } })),
        new Paragraph({ text: "Sincerely,", spacing: { before: 240 } }),
        ...(signature ? [new Paragraph({ children: [new ImageRun({ data: Buffer.from(signature, "base64"), transformation: { width: 205, height: 64 }, type: "png" })] })] : []),
        new Paragraph({ children: [new TextRun({ text: resume.identity.fullName, bold: true, color: accent })] }),
      ],
    }],
  });
  return Packer.toBuffer(document);
}
