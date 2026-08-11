import { extractResume } from "@/server/evidence/resume-extractor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("resume");
    if (!(file instanceof File)) return Response.json({ message: "Choose a PDF or DOCX résumé." }, { status: 400 });
    return Response.json({ data: await extractResume(file) });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "The résumé could not be read." }, { status: 400 });
  }
}
