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

function prompt(job: NormalizedJob) {
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
Questions to investigate

Use current web research. Prefer the employer's official website, reputable business publications, and authoritative public records. Cite factual claims inline. Clearly label uncertain, conflicting, or inferred information. Do not invent facts, do not provide personal contact information, and do not repeat the job description as company research.`;
}

export async function startCompanyResearch(job: NormalizedJob) {
  const response = await client().responses.create({
    model: configuredModel(),
    background: true,
    tools: [{
      type: "web_search",
      search_context_size: "medium",
      user_location: { type: "approximate", country: "US", region: "New York", timezone: "America/New_York" },
    }],
    tool_choice: "auto",
    input: prompt(job),
  });
  return { responseId: response.id, status: response.status };
}

export async function pollCompanyResearch(
  responseId: string,
  job: NormalizedJob,
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
        title: annotation.title,
        url: annotation.url,
      })));
    textOffset += item.text.length + 2;
  }
  if (!report || !citations.length) return { status: "failed", error: "Company research returned no cited report." };
  return {
    status: "completed",
    insight: {
      company: job.company,
      role: job.title,
      report,
      citations,
      generatedAt: new Date().toISOString(),
      model: response.model || configuredModel(),
    },
  };
}
