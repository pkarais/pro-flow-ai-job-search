import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import type { ArchivedApplication, OperationsState } from "@pro-flow/career-core";
import { DocumentService } from "./document-service.ts";

function safeArchiveName(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "application-documents";
}

function markdownList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None recorded";
}

export function interviewMarkdown(pack: OperationsState["interviews"][number]): string {
  return `# Interview preparation: ${pack.stage.replaceAll("_", " ")}\n\nGenerated ${pack.generatedAt}\n\n## Likely questions\n\n${markdownList(pack.likelyQuestions)}\n\n## Evidence-consistent talking points\n\n${markdownList(pack.consistencyClaims)}\n\n## Bridge answers\n\n${markdownList(pack.bridgeAnswers)}\n\n## Questions to ask\n\n${markdownList(pack.questionsToAsk)}\n`;
}

export function insightMarkdown(insight: OperationsState["companyInsights"][number]): string {
  const citations = insight.citations.map((citation) => `- [${citation.title}](${citation.url})`).join("\n");
  return `# ${insight.company}: company insights\n\nRole: ${insight.role}\n\nGenerated ${insight.generatedAt} with ${insight.model}\n\n${insight.report}\n\n## Sources\n\n${citations}\n`;
}

export async function buildApplicationArtifactBundle(
  dataRoot: string,
  applicationId: string,
  application?: ArchivedApplication,
  operations?: OperationsState,
  relatedApplications: ArchivedApplication[] = [],
) {
  const readiness = await new DocumentService(dataRoot).load(applicationId);
  if (!readiness || readiness.artifacts.length === 0) {
    throw new Error("No generated application artifacts are available.");
  }

  const directory = path.resolve(dataRoot, "applications", applicationId);
  const entries: Record<string, Uint8Array> = {};
  for (const artifact of readiness.artifacts) {
    if (artifact.relativePath !== path.basename(artifact.relativePath)) {
      throw new Error("The artifact manifest contains an unsafe path.");
    }
    const target = path.resolve(directory, artifact.relativePath);
    if (path.dirname(target) !== directory) {
      throw new Error("The artifact manifest escapes its application archive.");
    }
    entries[`documents/${artifact.relativePath}`] = new Uint8Array(await readFile(target));
  }

  entries["documents/readiness.json"] = strToU8(`${JSON.stringify(readiness, null, 2)}\n`);

  if (application && operations) {
    const opportunity = application.opportunity;
    const normalizedCompany = opportunity.companyName.trim().toLowerCase();
    const normalizedRole = opportunity.positionTitle.trim().toLowerCase();
    const matchingJobIds = new Set(operations.jobs
      .filter((job) => job.url === opportunity.url
        || (job.company.trim().toLowerCase() === normalizedCompany && job.title.trim().toLowerCase() === normalizedRole))
      .map((job) => job.id));
    const relatedIds = new Set([applicationId, ...relatedApplications.map((item) => item.id)]);
    const insights = operations.companyInsights.filter((insight) => matchingJobIds.has(insight.jobId)
      || (insight.company.trim().toLowerCase() === normalizedCompany && insight.role.trim().toLowerCase() === normalizedRole));
    const interviews = operations.interviews.filter((pack) => relatedIds.has(pack.applicationId));
    const pipeline = operations.pipeline.filter((record) => relatedIds.has(record.applicationId));
    const outcomes = operations.outcomes.filter((outcome) => relatedIds.has(outcome.applicationId));

    entries["application.json"] = strToU8(`${JSON.stringify(application, null, 2)}\n`);
    insights.forEach((insight, index) => {
      const prefix = `company-insights/${String(index + 1).padStart(2, "0")}-${safeArchiveName(insight.generatedAt)}`;
      entries[`${prefix}.md`] = strToU8(insightMarkdown(insight));
      entries[`${prefix}.json`] = strToU8(`${JSON.stringify(insight, null, 2)}\n`);
    });
    interviews.forEach((pack, index) => {
      const prefix = `interview/${String(index + 1).padStart(2, "0")}-${pack.stage}-${safeArchiveName(pack.applicationId)}`;
      entries[`${prefix}.md`] = strToU8(interviewMarkdown(pack));
      entries[`${prefix}.json`] = strToU8(`${JSON.stringify(pack, null, 2)}\n`);
    });
    entries["tracking/pipeline.json"] = strToU8(`${JSON.stringify(pipeline, null, 2)}\n`);
    entries["tracking/outcomes.json"] = strToU8(`${JSON.stringify(outcomes, null, 2)}\n`);
    entries["generations/index.json"] = strToU8(`${JSON.stringify(
      [application, ...relatedApplications.filter((item) => item.id !== applicationId)]
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .map((item) => ({
          applicationId: item.id,
          revision: item.revision,
          status: item.status,
          updatedAt: item.updatedAt,
          isPackagedDocumentGeneration: item.id === applicationId,
        })),
      null,
      2,
    )}\n`);
    entries["package-manifest.json"] = strToU8(`${JSON.stringify({
      schemaVersion: 1,
      applicationId,
      company: opportunity.companyName,
      role: opportunity.positionTitle,
      applicationRevision: application.revision,
      generatedAt: new Date().toISOString(),
      documentCount: readiness.artifacts.length,
      companyInsightCount: insights.length,
      interviewPackCount: interviews.length,
      pipelineRecordCount: pipeline.length,
      outcomeCount: outcomes.length,
      relatedGenerationCount: relatedIds.size,
    }, null, 2)}\n`);
  }

  const filenameStem = application
    ? `${safeArchiveName(application.opportunity.companyName)}-${safeArchiveName(application.opportunity.positionTitle)}-revision-${application.revision}`
    : safeArchiveName(applicationId);
  return {
    contents: Buffer.from(zipSync(entries, { level: 6 })),
    filename: `${filenameStem}-case-file.zip`,
    artifactCount: readiness.artifacts.length,
  };
}

export async function persistApplicationCaseFile(
  dataRoot: string,
  application: ArchivedApplication,
  bundle: Awaited<ReturnType<typeof buildApplicationArtifactBundle>>,
): Promise<string> {
  const directory = path.join(
    path.resolve(dataRoot),
    "vault",
    "companies",
    safeArchiveName(application.opportunity.companyName),
    safeArchiveName(application.opportunity.positionTitle),
    "generations",
    safeArchiveName(application.id),
  );
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, "case-file.zip");
  await writeFile(target, bundle.contents);
  await writeFile(path.join(directory, "case-index.json"), `${JSON.stringify({
    schemaVersion: 1,
    applicationId: application.id,
    revision: application.revision,
    company: application.opportunity.companyName,
    role: application.opportunity.positionTitle,
    updatedAt: application.updatedAt,
    packageFile: "case-file.zip",
  }, null, 2)}\n`);
  return target;
}
