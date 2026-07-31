export type AiMarketInsight = {
  date: string;
  share: number;
  previousShare?: number;
  trend: "rising" | "falling" | "stable";
};

const SOURCE = "https://raw.githubusercontent.com/hiring-lab/ai-tracker/main/AI_posting.csv";

export function parseUsAiMarketInsight(csv: string): AiMarketInsight | null {
  const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = lines.shift()?.split(",").map((header) => header.trim()) ?? [];
  const dateIndex = headers.indexOf("date");
  const countryIndex = headers.indexOf("jobcountry");
  const shareIndex = headers.findIndex((header) => /share.*postings|postings.*share/i.test(header));
  if (dateIndex < 0 || countryIndex < 0 || shareIndex < 0) return null;
  const values = lines
    .map((line) => line.split(","))
    .filter((row) => row[countryIndex]?.trim().toUpperCase() === "US")
    .map((row) => ({ date: row[dateIndex]?.trim(), share: Number(row[shareIndex]) }))
    .filter((row): row is { date: string; share: number } => Boolean(row.date) && Number.isFinite(row.share))
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = values.at(-1);
  if (!latest) return null;
  const previous = values.at(-8) ?? values.at(-2);
  const delta = previous ? latest.share - previous.share : 0;
  return {
    ...latest,
    previousShare: previous?.share,
    trend: Math.abs(delta) < 0.01 ? "stable" : delta > 0 ? "rising" : "falling",
  };
}

export async function loadUsAiMarketInsight(): Promise<AiMarketInsight | null> {
  try {
    const response = await fetch(SOURCE, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    return parseUsAiMarketInsight(await response.text());
  } catch {
    return null;
  }
}
