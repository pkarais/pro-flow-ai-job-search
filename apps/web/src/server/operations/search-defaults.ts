import {
  effectiveEvidenceValue,
  searchDefaultsSchema,
  type CanonicalCareerProfile,
  type EvidenceImportResult,
  type SearchDefaults,
} from "@pro-flow/career-core";

type SearchFact = {
  path: string;
  sourceId: string;
  sourceSection?: string;
  value: string;
};

const roleSignal = /\b(role|roles|title|titles|position|positions|headline|target|occupation|career direction)\b/i;
const skillSignal = /\b(skill|skills|capabilit|expertise|competenc|specialt)/i;
const locationSignal = /\b(location|locations|based|geograph|region|city|state)\b/i;
const usLocationSignal = /\b(united states|u\.?s\.?a?\.?|remote|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia)\b/i;

function clean(value: string): string {
  return value
    .replace(/^[-*#>\d.)\s]+/, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = clean(raw);
    const key = value.toLowerCase();
    if (!value || value.length < 2 || value.length > 200 || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length === limit) break;
  }
  return result;
}

function factsFromCanonical(profile: CanonicalCareerProfile): SearchFact[] {
  return profile.records.flatMap((record) => {
    const value = effectiveEvidenceValue(record);
    return value ? [{ ...record, value }] : [];
  });
}

function factsFromPreview(preview: EvidenceImportResult): SearchFact[] {
  return preview.facts.map((fact) => ({
    path: fact.path,
    sourceId: fact.sourceId,
    sourceSection: fact.sourceSection,
    value: fact.value,
  }));
}

export function deriveSearchDefaults(
  profile: CanonicalCareerProfile | null,
  preview?: EvidenceImportResult,
  userSelectedRoles: string[] = [],
  userSelectedLocations: string[] = [],
): SearchDefaults {
  const facts = profile ? factsFromCanonical(profile) : preview ? factsFromPreview(preview) : [];
  const roles: string[] = [];
  const locations: string[] = [];

  for (const fact of facts) {
    const context = `${fact.path} ${fact.sourceSection ?? ""}`;
    if (roleSignal.test(context)) roles.push(fact.value);
    if (skillSignal.test(context) || fact.sourceId === "skills") {
      roles.push(...fact.value.split(/[,;|/]/));
    }
    if (locationSignal.test(context) && usLocationSignal.test(fact.value)) {
      locations.push(fact.value);
    }
  }

  return searchDefaultsSchema.parse({
    roles: unique([...userSelectedRoles, ...roles], 40),
    locations: unique([
      ...userSelectedLocations,
      ...locations,
      "United States",
    ], 20),
    source: profile ? "reviewed_profile" : preview ? "import_preview" : "fallback",
  });
}
