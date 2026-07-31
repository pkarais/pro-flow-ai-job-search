import { z } from "zod";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { resolveCandidateContact } from "@/server/canonical/candidate-contact-service";
import { ApplicationStore } from "@/server/applications/application-store";
import { DocumentService } from "@/server/documents/document-service";
import { createApplicationEmailPackage, extractDirectApplicationEmails } from "@/server/documents/email-package-service";
import { OperationsStore } from "@/server/operations/operations-store";
import { gmailStatus } from "@/server/integrations/gmail-service";

const requestSchema = z.object({
  applicationId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  recipient: z.email(),
  documentStyle: z.enum(["ats", "designed"]),
  senderName: z.string().trim().max(200).default(""),
}).strict();

async function context(applicationId: string) {
  const dataRoot = careerDataRoot();
  const [application, operations, readiness, profile] = await Promise.all([
    new ApplicationStore(dataRoot).load(applicationId),
    new OperationsStore(dataRoot).load(),
    new DocumentService(dataRoot).load(applicationId),
    loadCanonicalProfile(),
  ]);
  return { dataRoot, application, operations, readiness, profile };
}

export async function GET(request: Request) {
  try {
    const applicationId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/).parse(new URL(request.url).searchParams.get("applicationId"));
    const loaded = await context(applicationId);
    if (!loaded.application) return Response.json({ error: "Application not found." }, { status: 404 });
    return Response.json({
      recipients: extractDirectApplicationEmails(loaded.application, loaded.operations),
      ready: loaded.readiness?.status === "ready",
      gmail: await gmailStatus(loaded.dataRoot),
    }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Unable to load direct-application recipients." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const loaded = await context(input.applicationId);
    if (!loaded.application) return Response.json({ error: "Application not found." }, { status: 404 });
    if (loaded.readiness?.status !== "ready") return Response.json({ error: "Documents must pass readiness and visual review first." }, { status: 409 });
    const recipients = extractDirectApplicationEmails(loaded.application, loaded.operations);
    if (!recipients.includes(input.recipient.toLowerCase())) {
      return Response.json({ error: "Select an email address found in the saved direct-application research." }, { status: 400 });
    }
    const contact = await resolveCandidateContact(loaded.dataRoot, loaded.profile);
    const message = await createApplicationEmailPackage({
      dataRoot: loaded.dataRoot,
      application: loaded.application,
      recipient: input.recipient,
      documentStyle: input.documentStyle,
      senderName: input.senderName,
      senderEmail: contact.email,
    });
    return new Response(new Uint8Array(message.contents), { headers: {
      "content-type": "message/rfc822",
      "content-disposition": `attachment; filename="${message.filename}"`,
      "cache-control": "private, no-store",
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to prepare the email package." }, { status: 400 });
  }
}
