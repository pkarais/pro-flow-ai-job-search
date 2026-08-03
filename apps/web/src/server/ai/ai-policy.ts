import { createHash } from "node:crypto";

export type AiOperation = "application_writing" | "refinement_suggestions" | "interview_writing" | "company_overview" | "direct_application";

export function modelFor(operation: AiOperation): string {
  if (operation === "application_writing") return process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
  if (operation === "company_overview" || operation === "direct_application") {
    return process.env.OPENAI_INSIGHTS_MODEL?.trim() || process.env.OPENAI_SUPPORT_MODEL?.trim() || "gpt-5.6-terra";
  }
  return process.env.OPENAI_SUPPORT_MODEL?.trim() || "gpt-5.6-terra";
}

export function maxOutputTokens(operation: AiOperation): number {
  if (operation === "application_writing") return 12_000;
  if (operation === "company_overview") return 10_000;
  if (operation === "direct_application") return 6_000;
  if (operation === "interview_writing") return 7_000;
  return 5_000;
}

export function promptCacheKey(operation: AiOperation, identity: string): string {
  return `pro-flow:${operation}:${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}

export function cleanOpportunityText(value: string | null | undefined, limit = 24_000): string {
  return (value || "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/\{[^{}]{80,}\}/g, " ")
    .replace(/\b(?:margin|padding|font-family|line-height|border|display|position|background-color)\s*:[^;\n}]+;?/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, limit);
}

export function compactInsight(value: string, limit = 8_000): string {
  return value.replace(/\n{3,}/g, "\n\n").trim().slice(0, limit);
}
