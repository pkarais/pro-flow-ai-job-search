import OpenAI from "openai";
import type { CompanyInsightRecord, NormalizedJob } from "@pro-flow/career-core";

export async function researchCompany(job: NormalizedJob): Promise<Omit<CompanyInsightRecord, "id" | "jobId">> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const model = process.env.OPENAI_INSIGHTS_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
  const timeout = Number.parseInt(process.env.OPENAI_REQUEST_TIMEOUT_MS?.trim() || "120000", 10);
  const client = new OpenAI({ apiKey, maxRetries: 1, timeout: Number.isFinite(timeout) ? timeout : 120_000 });
  const response = await client.responses.create({
    model,
    tools: [{
      type: "web_search",
      search_context_size: "medium",
      user_location: { type: "approximate", country: "US", region: "New York", timezone: "America/New_York" },
    }],
    tool_choice: "auto",
    input: `Research the employer below for a job candidate preparing an application.

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

Use current web research. Prefer the employer's official website, reputable business publications, and authoritative public records. Cite factual claims inline. Clearly label uncertain, conflicting, or inferred information. Do not invent facts, do not provide personal contact information, and do not repeat the job description as company research.`,
  });
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
  if (!report || !citations.length) throw new Error("Company research returned no cited report.");
  return {
    company: job.company,
    role: job.title,
    report,
    citations,
    generatedAt: new Date().toISOString(),
    model,
  };
}
