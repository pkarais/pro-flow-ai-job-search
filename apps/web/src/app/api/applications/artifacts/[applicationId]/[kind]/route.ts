import { readFile } from "node:fs/promises";
import path from "node:path";
import { recordIdSchema } from "@pro-flow/career-core";
import { careerDataRoot } from "@/server/canonical/review-service";
import { buildApplicationArtifactBundle, insightMarkdown, interviewMarkdown } from "@/server/documents/artifact-bundle";
import { ApplicationStore } from "@/server/applications/application-store";
import { OperationsStore } from "@/server/operations/operations-store";
import { listApplicationArchives } from "@/server/operations/operations-service";

const artifacts = {
  cv_source: ["cv.tex", "application/x-tex"],
  cover_letter_source: ["cover-letter.tex", "application/x-tex"],
  cv_pdf: ["cv.pdf", "application/pdf"],
  cover_letter_pdf: ["cover-letter.pdf", "application/pdf"],
  ats_text: ["cv-ats.txt", "text/plain; charset=utf-8"],
  designed_resume_html: ["designed-resume.html", "text/html; charset=utf-8"],
  designed_resume_pdf: ["designed-resume.pdf", "application/pdf"],
  resume_docx: ["resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  designed_cover_letter_html: ["designed-cover-letter.html", "text/html; charset=utf-8"],
  designed_cover_letter_pdf: ["designed-cover-letter.pdf", "application/pdf"],
  cover_letter_docx: ["cover-letter.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ applicationId: string; kind: string }> },
) {
  try {
    const { applicationId: rawId, kind } = await context.params;
    const applicationId = recordIdSchema.parse(rawId);
    if (kind === "bundle" || ["company_insights_md", "company_insights_json", "interview_pack_md", "interview_pack_json"].includes(kind)) {
      const dataRoot = careerDataRoot();
      const [application, operations, applications] = await Promise.all([
        new ApplicationStore(dataRoot).load(applicationId),
        new OperationsStore(dataRoot).load(),
        listApplicationArchives(dataRoot),
      ]);
      if (!application) return new Response("Application archive not found.", { status: 404 });
      const relatedApplications = applications.filter((candidate) => candidate.opportunity.url === application.opportunity.url
        || (candidate.opportunity.companyName.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase()
          && candidate.opportunity.positionTitle.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase()));
      if (kind !== "bundle") {
        const relatedIds = new Set(relatedApplications.map((candidate) => candidate.id));
        const matchingJobIds = new Set(operations.jobs.filter((job) => job.url === application.opportunity.url
          || (job.company.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase()
            && job.title.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase())).map((job) => job.id));
        const insights = operations.companyInsights.filter((report) => matchingJobIds.has(report.jobId)
          || (report.company.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase()
            && report.role.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase()));
        const interviews = operations.interviews.filter((pack) => relatedIds.has(pack.applicationId));
        const isJson = kind.endsWith("_json");
        const records = kind.startsWith("company_") ? insights : interviews;
        if (!records.length) return new Response("Supplemental artifact not found.", { status: 404 });
        const contents = isJson
          ? `${JSON.stringify(records, null, 2)}\n`
          : kind.startsWith("company_")
            ? insights.map(insightMarkdown).join("\n\n---\n\n")
            : interviews.map(interviewMarkdown).join("\n\n---\n\n");
        const filename = kind.startsWith("company_") ? `company-insights.${isJson ? "json" : "md"}` : `interview-preparation.${isJson ? "json" : "md"}`;
        return new Response(contents, { headers: {
          "content-type": isJson ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`,
          "cache-control": "private, no-store",
        } });
      }
      const bundle = await buildApplicationArtifactBundle(
        dataRoot,
        applicationId,
        application,
        operations,
        relatedApplications,
      );
      return new Response(bundle.contents, {
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${bundle.filename}"`,
          "cache-control": "private, no-store",
        },
      });
    }
    const artifact = artifacts[kind as keyof typeof artifacts];
    if (!artifact) return new Response("Artifact not found.", { status: 404 });
    const target = path.resolve(careerDataRoot(), "applications", applicationId, artifact[0]);
    const contents = await readFile(target);
    return new Response(contents, {
      headers: {
        "content-type": artifact[1],
        "content-disposition": `${kind.endsWith("_docx") ? "attachment" : "inline"}; filename="${artifact[0]}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return new Response("Artifact not found.", { status: 404 });
  }
}
