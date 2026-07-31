import { readFile } from "node:fs/promises";
import path from "node:path";
import { recordIdSchema } from "@pro-flow/career-core";
import { careerDataRoot } from "@/server/canonical/review-service";
import { buildApplicationArtifactBundle } from "@/server/documents/artifact-bundle";

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
    if (kind === "bundle") {
      const bundle = await buildApplicationArtifactBundle(careerDataRoot(), applicationId);
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
