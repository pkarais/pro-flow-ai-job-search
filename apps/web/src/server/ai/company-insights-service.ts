import OpenAI from "openai";
import type { CompanyInsightRecord, NormalizedJob } from "@pro-flow/career-core";

function client() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey, maxRetries: 1, timeout: 30_000 });
}

function configuredModel() {
  return process.env.OPENAI_INSIGHTS_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
}

export type CompanyResearchKind = "company_overview" | "direct_application";

function prompt(job: NormalizedJob, kind: CompanyResearchKind) {
  if (kind === "direct_application") return `Research legitimate, public ways to apply directly to this employer for the specific opportunity below.

Company: ${job.company}
Role: ${job.title}
Location: ${job.location ?? "Not supplied"}
Original posting URL: ${job.url}

Produce a concise report with these exact headings:
Best official application route
Official careers page
Public recruiting or application email
Other verified public contact route
Recommended next step
Verification cautions

Start with the original posting, including its employer name, street address, location, and any linked employer site. Establish the employer's official domain before following public pages. Then inspect the official job posting, careers/jobs pages, and relevant public contact, about, location, or join-us pages. A clearly identified official applicant-tracking page may also be used.

Report an email address only when it is explicitly published by the employer for recruiting, careers, human resources, the specific job, or job applications. Read visible page content and legitimate public page markup where available, including mailto links, plain or entity-encoded addresses, structured contact data, and addresses revealed normally by the rendered public page. Cite the exact source page and explain the nearby hiring context.

Never infer an email pattern, guess an address, provide a private or personal address, recommend contacting an unrelated employee, or probe SMTP, DNS, undocumented APIs, webhooks, form processors, admin routes, source maps, or leaked configuration. Reject email-input examples such as you@company.com, vendor addresses, and addresses found only in scripts, templates, comments, privacy text, or unrelated domains. A sales, project-consultation, customer-support, or general inquiry form is not a recruiting route; it may be listed only as a clearly labeled low-confidence fallback. A fetch destination or automation webhook is infrastructure, not a contact address.

Rank results in this order: an exact job-specific published application route; a published recruiting/HR address; the official careers or applicant-tracking page; then a clearly labeled general company contact fallback. If no qualifying public email exists, say so clearly rather than manufacturing one. Explain whether the role appears on the official employer site. Cite every discovered route inline. Do not submit a form, send an email, or contact anyone.`;
  return `Research the employer below for a job candidate preparing an application.

Company: ${job.company}
Role: ${job.title}
Location: ${job.location ?? "Not supplied"}
Posting URL: ${job.url}

Produce a concise, factual report with these exact headings:
Company overview
History and ownership
Business, customers, and operating footprint
Leadership and culture signals
Recent developments
What matters for this role
Role scope and title/pay alignment
Market compensation estimate
Questions to investigate

Use current web research. Prefer the employer's official website, reputable business publications, government labor data, and authoritative public records. Cite factual claims inline. Clearly label uncertain, conflicting, or inferred information. Do not invent facts, do not provide personal contact information, and do not repeat the job description as company research.

For Role scope and title/pay alignment, test whether the advertised title, stated requirements, and posted compensation accurately reflect the work's apparent real-world scale. Combine the posting with company research and assess every supported scope variable: site acreage; number and type of buildings; age and complexity of physical assets; mechanical, electrical, plumbing, HVAC, life-safety, security, utility, grounds, and infrastructure responsibility; member, guest, patient, student, tenant, or public-facing service expectations; operating hours and emergency coverage; maintenance backlog; planned improvements; construction and capital-program responsibility; project values; budget authority; purchasing; vendors and contractors; union environment; staff size and layers; regulatory exposure; travel; and executive reporting. Identify responsibilities commonly associated with a more senior or differently titled market role. Describe any mismatch as an evidence-based scope or compensation risk, not as proof of deceptive intent.

For Market compensation estimate, do not perform a title-only lookup. Value the complete role revealed by the supplied job description and the company/site research, including the title, location, industry, seniority, leadership span, operational and capital scope, asset complexity, required credentials, travel, risk, and specialized responsibilities. Compare against multiple genuinely comparable role families when the advertised title understates the duties—for example facilities executive, campus operations leader, construction and facilities director, chief engineer, or capital-program leader. Report a defensible current annual base-salary range for the position and location, plus total-compensation context when credible sources support it. Distinguish any employer-posted range from the external market estimate. Explain the strongest variables moving the estimate up or down, cite the compensation sources inline, identify the data year, and label the result as an estimate rather than a promise. If evidence is insufficient, say so rather than inventing a range.

Job description:
${job.description ?? "No job description was captured; limit the estimate accordingly."}`;
}

export async function startCompanyResearch(job: NormalizedJob, kind: CompanyResearchKind = "company_overview") {
  const response = await client().responses.create({
    model: configuredModel(),
    background: true,
    tools: [{
      type: "web_search",
      search_context_size: "medium",
      user_location: { type: "approximate", country: "US", region: "New York", timezone: "America/New_York" },
    }],
    tool_choice: "auto",
    input: prompt(job, kind),
  });
  if (typeof response.id !== "string" || !response.id.startsWith("resp")) {
    throw new Error("The AI provider did not return a valid background research ID.");
  }
  return { responseId: response.id, status: response.status, kind };
}

export async function pollCompanyResearch(
  responseId: string,
  job: NormalizedJob,
  kind: CompanyResearchKind = "company_overview",
): Promise<
  | { status: "queued" | "in_progress" }
  | { status: "failed"; error: string }
  | { status: "completed"; insight: Omit<CompanyInsightRecord, "id" | "jobId"> }
> {
  const response = await client().responses.retrieve(responseId);
  if (response.status === "queued" || response.status === "in_progress") return { status: response.status };
  if (response.status !== "completed") {
    return { status: "failed", error: response.error?.message || `Company research ended with status ${response.status}.` };
  }
  const textParts = response.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content.filter((content) => content.type === "output_text"));
  const report = textParts.map((item) => item.text).join("\n\n").trim();
  let textOffset = 0;
  const citations: CompanyInsightRecord["citations"] = [];
  for (const item of textParts) {
    citations.push(...item.annotations
      .filter((annotation) => annotation.type === "url_citation")
      .map((annotation) => ({
        startIndex: textOffset + annotation.start_index,
        endIndex: textOffset + annotation.end_index,
        title: annotation.title?.trim() || new URL(annotation.url).hostname,
        url: annotation.url,
      })));
    textOffset += item.text.length + 2;
  }
  if (!report || !citations.length) return { status: "failed", error: "Company research returned no cited report." };
  return {
    status: "completed",
    insight: {
      kind,
      company: job.company,
      role: job.title,
      report,
      citations,
      generatedAt: new Date().toISOString(),
      model: response.model || configuredModel(),
    },
  };
}
