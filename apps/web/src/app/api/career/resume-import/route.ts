import { z, ZodError } from "zod";
import { importResumeEvidence, RevisionConflictError } from "@/server/canonical/review-service";

export const runtime = "nodejs";

const requestSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  fileName: z.string().trim().min(1).max(255),
  items: z.array(z.object({
    category: z.enum(["experience", "skills", "projects", "education", "credentials", "other"]),
    section: z.string().trim().min(1).max(200),
    value: z.string().trim().min(1).max(2_000),
  }).strict()).min(1).max(150),
}).strict();

export async function POST(request: Request) {
  try {
    const result = await importResumeEvidence(requestSchema.parse(await request.json()));
    return Response.json({ data: { revision: result.profile.revision, imported: result.imported } });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ message: "Select valid résumé items to import." }, { status: 400 });
    if (error instanceof RevisionConflictError) return Response.json({ message: error.message }, { status: 409 });
    return Response.json({ message: "The selected résumé evidence could not be saved." }, { status: 500 });
  }
}
