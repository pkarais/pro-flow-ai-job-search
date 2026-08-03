import { copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "../project-root.ts";
import type { AiOperation } from "./ai-policy";

type ResponseUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
};

export type AiUsageRecord = {
  responseId: string;
  operation: AiOperation;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  webSearchCalls: number;
  estimatedCostUsd: number | null;
  recordedAt: string;
};

const targetPath = () => path.join(projectRoot(), "career-data", "ai-usage.json");
let queue: Promise<void> = Promise.resolve();

const rates: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-5.6-sol": { input: 5, cached: 0.5, output: 30 },
  "gpt-5.6-terra": { input: 2, cached: 0.2, output: 12 },
  "gpt-5.6-luna": { input: 0.2, cached: 0.02, output: 1.2 },
};

async function load(): Promise<AiUsageRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(targetPath(), "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(records: AiUsageRecord[]) {
  const target = targetPath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(records.slice(-2_000), null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    await rename(temporary, target);
  } catch (error) {
    if (!(["EPERM", "EACCES", "EBUSY"].includes((error as NodeJS.ErrnoException).code ?? ""))) throw error;
    await copyFile(temporary, target);
    await unlink(temporary).catch(() => undefined);
  }
}

export async function recordAiUsage(args: {
  response: { id?: string; model?: string; usage?: ResponseUsage | null; output?: Array<{ type?: string }> };
  operation: AiOperation;
}) {
  const responseId = args.response.id || crypto.randomUUID();
  const usage = args.response.usage;
  if (!usage) return;
  const model = args.response.model || "unknown";
  const input = usage.input_tokens || 0;
  const cached = usage.input_tokens_details?.cached_tokens || 0;
  const output = usage.output_tokens || 0;
  const searches = args.response.output?.filter((item) => item.type === "web_search_call").length || 0;
  const rate = rates[model];
  const estimatedCostUsd = rate
    ? Number(((((input - cached) * rate.input) + (cached * rate.cached) + (output * rate.output)) / 1_000_000 + searches * 0.01).toFixed(6))
    : null;
  const record: AiUsageRecord = {
    responseId,
    operation: args.operation,
    model,
    inputTokens: input,
    cachedInputTokens: cached,
    outputTokens: output,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens || 0,
    totalTokens: usage.total_tokens || input + output,
    webSearchCalls: searches,
    estimatedCostUsd,
    recordedAt: new Date().toISOString(),
  };
  const operation = queue.then(async () => {
    const current = await load();
    if (current.some((item) => item.responseId === responseId)) return;
    await save([...current, record]);
  });
  queue = operation.catch(() => undefined);
  await operation;
}

export async function loadAiUsageSummary() {
  const records = await load();
  const month = new Date().toISOString().slice(0, 7);
  const current = records.filter((item) => item.recordedAt.startsWith(month));
  const estimatedCostUsd = current.reduce((sum, item) => sum + (item.estimatedCostUsd || 0), 0);
  const configuredBudget = Number.parseFloat(process.env.OPENAI_MONTHLY_BUDGET_USD?.trim() || "");
  return {
    requestCount: current.length,
    inputTokens: current.reduce((sum, item) => sum + item.inputTokens, 0),
    outputTokens: current.reduce((sum, item) => sum + item.outputTokens, 0),
    webSearchCalls: current.reduce((sum, item) => sum + item.webSearchCalls, 0),
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(2)),
    monthlyBudgetUsd: Number.isFinite(configuredBudget) && configuredBudget > 0 ? configuredBudget : null,
  };
}

export async function assertAiBudgetAvailable() {
  const summary = await loadAiUsageSummary();
  if (summary.monthlyBudgetUsd !== null && summary.estimatedCostUsd >= summary.monthlyBudgetUsd) {
    throw new Error(`The configured monthly AI budget of $${summary.monthlyBudgetUsd.toFixed(2)} has been reached.`);
  }
}
