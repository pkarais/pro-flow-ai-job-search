import { z } from "zod";
import { careerDataRoot, loadCanonicalProfile } from "@/server/canonical/review-service";
import { resolveCandidateContact } from "@/server/canonical/candidate-contact-service";
import { ApplicationStore } from "@/server/applications/application-store";
import { DocumentService } from "@/server/documents/document-service";
import { createApplicationEmailPackage, extractDirectApplicationEmails } from "@/server/documents/email-package-service";
import { createGmailDraft } from "@/server/integrations/gmail-service";
import { OperationsStore } from "@/server/operations/operations-store";

const inputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("interview"), applicationId: z.string(), interviewGeneratedAt: z.string() }).strict(),
  z.object({ kind: z.literal("application"), applicationId: z.string(), recipient: z.email(), documentStyle: z.enum(["ats", "designed"]), senderName: z.string().max(200) }).strict(),
]);

function interviewMessage(to: string, company: string, role: string, pack: Awaited<ReturnType<OperationsStore["load"]>>["interviews"][number]) {
  const subject = `Phone interview brief — ${company} — ${role}`.replace(/[\r\n]+/g, " ");
  const lines = [
    `${role} at ${company}`,
    `Stage: ${pack.stage.replaceAll("_", " ")}`,
    pack.scheduledAt ? `Scheduled: ${new Date(pack.scheduledAt).toLocaleString()}` : "",
    "", "LIKELY QUESTIONS", ...pack.likelyQuestions.map((question, index) => `${index + 1}. ${question}`),
    "", "GROUNDED BRIDGE ANSWERS", ...pack.bridgeAnswers.map((answer, index) => `${index + 1}. ${answer}`),
    "", "QUESTIONS TO ASK", ...pack.questionsToAsk.map((question, index) => `${index + 1}. ${question}`),
    "", "VERIFIED TALKING POINTS", ...pack.consistencyClaims.map((claim) => `- ${claim}`),
  ].join("\r\n");
  return Buffer.from([`To: ${to.replace(/[\r\n]+/g, "")}`, `Subject: ${subject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", lines, ""].join("\r\n"), "utf8");
}

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const dataRoot = careerDataRoot();
    const [application, operations, profile] = await Promise.all([new ApplicationStore(dataRoot).load(input.applicationId), new OperationsStore(dataRoot).load(), loadCanonicalProfile()]);
    if (!application) return Response.json({ error: "Application not found." }, { status: 404 });
    let raw: Buffer;
    if (input.kind === "interview") {
      const pack = operations.interviews.find((candidate) => candidate.generatedAt === input.interviewGeneratedAt && candidate.applicationId === input.applicationId);
      if (!pack) return Response.json({ error: "Interview brief not found." }, { status: 404 });
      const contact = await resolveCandidateContact(dataRoot, profile);
      if (!contact.email) return Response.json({ error: "No saved candidate email address is available." }, { status: 409 });
      raw = interviewMessage(contact.email, application.opportunity.companyName, application.opportunity.positionTitle, pack);
    } else {
      const readiness = await new DocumentService(dataRoot).load(input.applicationId);
      if (readiness?.status !== "ready") return Response.json({ error: "Documents must pass readiness and visual review first." }, { status: 409 });
      if (!extractDirectApplicationEmails(application, operations).includes(input.recipient.toLowerCase())) return Response.json({ error: "Select an email address found in saved direct-application research." }, { status: 400 });
      const contact = await resolveCandidateContact(dataRoot, profile);
      raw = (await createApplicationEmailPackage({ dataRoot, application, recipient: input.recipient, documentStyle: input.documentStyle, senderName: input.senderName, senderEmail: contact.email })).contents;
    }
    const draft = await createGmailDraft(dataRoot, raw);
    return Response.json({ ...draft, gmailUrl: `https://mail.google.com/mail/u/0/#drafts/${draft.messageId || draft.draftId}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create the Gmail draft." }, { status: 400 });
  }
}
