import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ArchivedApplication, OperationsState } from "@pro-flow/career-core";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function matchingDirectApplicationReports(application: ArchivedApplication, operations: OperationsState) {
  const company = application.opportunity.companyName.trim().toLowerCase();
  const role = application.opportunity.positionTitle.trim().toLowerCase();
  const matchingJobIds = new Set(operations.jobs.filter((job) => job.url === application.opportunity.url
    || (job.company.trim().toLowerCase() === company && job.title.trim().toLowerCase() === role)).map((job) => job.id));
  return operations.companyInsights.filter((report) => report.kind === "direct_application"
    && (matchingJobIds.has(report.jobId)
      || (report.company.trim().toLowerCase() === company && report.role.trim().toLowerCase() === role)));
}

export function extractDirectApplicationEmails(application: ArchivedApplication, operations: OperationsState): string[] {
  return [...new Set(matchingDirectApplicationReports(application, operations)
    .flatMap((report) => report.report.match(emailPattern) ?? [])
    .map((email) => email.toLowerCase()))].slice(0, 20);
}

function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function base64Lines(contents: Buffer): string {
  return contents.toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "application";
}

export async function createApplicationEmailPackage(options: {
  dataRoot: string;
  application: ArchivedApplication;
  recipient: string;
  documentStyle: "ats" | "designed";
  senderName: string;
  senderEmail: string;
}): Promise<{ contents: Buffer; filename: string }> {
  const { dataRoot, application, recipient, documentStyle } = options;
  const directory = path.resolve(dataRoot, "applications", application.id);
  const attachments = documentStyle === "designed"
    ? [["designed-resume.pdf", "resume.pdf"], ["designed-cover-letter.pdf", "cover-letter.pdf"]]
    : [["cv.pdf", "resume.pdf"], ["cover-letter.pdf", "cover-letter.pdf"]];
  const boundary = `pro-flow-${crypto.randomUUID()}`;
  const company = cleanHeader(application.opportunity.companyName);
  const role = cleanHeader(application.opportunity.positionTitle);
  const senderName = cleanHeader(options.senderName) || "Candidate";
  const senderEmail = cleanHeader(options.senderEmail);
  const subject = `Application for ${role} — ${senderName}`;
  const body = `Dear Hiring Team,\r\n\r\nPlease find attached my résumé and cover letter for the ${role} opportunity at ${company}. I would welcome the opportunity to discuss how my experience aligns with your needs.\r\n\r\nThank you for your consideration.\r\n\r\nSincerely,\r\n${senderName}${senderEmail ? `\r\n${senderEmail}` : ""}`;
  const parts = [
    `To: ${cleanHeader(recipient)}`,
    ...(senderEmail ? [`From: ${senderName} <${senderEmail}>`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ];
  for (const [source, filename] of attachments) {
    const contents = await readFile(path.join(directory, source));
    parts.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      base64Lines(contents),
    );
  }
  parts.push(`--${boundary}--`, "");
  return {
    contents: Buffer.from(parts.join("\r\n"), "utf8"),
    filename: `${safeFilename(company)}-${safeFilename(role)}-email-draft.eml`,
  };
}
