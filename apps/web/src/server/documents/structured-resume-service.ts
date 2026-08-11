import {
  effectiveEvidenceValue,
  structuredResumeSchema,
  type ArchivedApplication,
  type CanonicalCareerProfile,
  type DocumentIdentity,
  type DocumentPalette,
  type DocumentThemeId,
  type StructuredResume,
} from "@pro-flow/career-core";
import { formatJobLocation } from "./location-format.ts";

function clean(value: string): string {
  return value
    .replaceAll("—", " - ").replaceAll("–", "-").replaceAll("’", "'")
    .replaceAll("â€”", " - ").replaceAll("â€“", "-").replaceAll("â€™", "'")
    .replace(/[ \t]+/g, " ").trim();
}

function resumeSummary(value: string): string {
  const normalized = clean(value)
    .replace(/^I am an?\s+/i, "")
    .replace(/\bIn my current .*? role, I manage\b/i, "Currently manages")
    .replace(/\bI manage\b/g, "Manages")
    .replace(/\bI bring\b/g, "Brings")
    .replace(/\bmy\b/gi, "the")
    .replace(/\bI\b/g, "The candidate");
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : normalized;
}

function groupCompetencies(items: string[]) {
  const definitions = [
    { label: "Leadership & Operations", pattern: /leadership|staff|supervision|scheduling|payroll|reporting|budget|process|change/i },
    { label: "Facilities & Infrastructure", pattern: /facilit|infrastructure|maintenance|vendor|contractor|construction|safety|compliance|incident/i },
    { label: "Systems & Technical Delivery", pattern: /system|workflow|technical|technology|data|equipment|mechanical|electrical|sustainability/i },
  ];
  const groups = definitions.map((group) => ({ ...group, items: [] as string[] }));
  for (const item of items) {
    const group = groups.find((candidate) => candidate.pattern.test(item)) ?? groups[0];
    group.items.push(item);
  }
  return groups.filter((group) => group.items.length).map(({ label, items: grouped }) => ({ label, items: grouped.slice(0, 12) }));
}

export function tailoredCompetencies(claimText: string, fallback: string[]) {
  const definitions = [
    ["Facilities Operations", /facilit(?:y|ies)|building operations/i],
    ["Multi-Site Operations", /multi[- ]site/i],
    ["Preventive Maintenance", /preventive maintenance/i],
    ["Predictive Maintenance", /predictive maintenance/i],
    ["Infrastructure Planning", /infrastructure planning|infrastructure improvements?/i],
    ["Capital Projects", /capital projects?|construction projects?|major repair/i],
    ["Vendor & Contractor Management", /vendor|contractor/i],
    ["Team Leadership", /staff|personnel|supervis|team leadership/i],
    ["HVAC & Building Systems", /hvac|building systems/i],
    ["Boilers & Steam Systems", /boiler|steam/i],
    ["Compressed Air", /compress(?:or|ed air)/i],
    ["Pumps, Motors & Rotating Equipment", /pumps?|motors?|rotating equipment/i],
    ["Electrical & Mechanical Systems", /electrical|mechanical/i],
    ["Regulatory Compliance", /regulatory|compliance/i],
    ["Audit & Validation Support", /audit|validation/i],
    ["Life-Safety Systems", /life[- ]safety|fire-command/i],
    ["CMMS & Maintenance Controls", /cmms|maintenance tickets?|work orders?/i],
    ["Operational Reporting", /dashboard|operational reporting|recurring operational briefs?/i],
    ["SOP, Inventory & Vendor Records", /sop|inventory|vendor tracking/i],
    ["Energy & Sustainability Planning", /energy|sustainability|net zero/i],
    ["Root-Cause Problem Solving", /root cause|troubleshoot|problem solving/i],
  ] as const;
  const tailored = definitions.filter(([, pattern]) => pattern.test(claimText)).map(([label]) => label);
  return [...new Set([...tailored, ...fallback])].slice(0, 16);
}

export function verifiedMetricCallouts(
  claims: Array<{ text: string; evidenceIds: string[] }>,
  metricEvidenceIds: Set<string>,
) {
  return claims.filter((claim) =>
    claim.evidenceIds.some((id) => metricEvidenceIds.has(id)),
  ).flatMap((claim) => {
    const found = claim.text.match(/\b(?:\d+(?:\.\d+)?%|\$[\d,.]+|\d+\+?)\b/g) ?? [];
    return found.slice(0, 2).map((metric) => ({
      label: clean(claim.text).slice(0, 180),
      value: metric,
      evidenceIds: claim.evidenceIds,
    }));
  }).slice(0, 8);
}

function relevantProjects(
  profile: CanonicalCareerProfile,
  claims: Array<{ text: string; evidenceIds: string[] }>,
) {
  const projectRecords = new Map(profile.records
    .filter((record) => record.path.startsWith("projects."))
    .map((record) => [record.id, record]));
  const grouped = new Map<string, { descriptions: string[]; evidenceIds: string[] }>();
  for (const claim of claims) {
    const supporting = claim.evidenceIds
      .map((id) => projectRecords.get(id))
      .filter((record): record is NonNullable<typeof record> => Boolean(record));
    for (const record of supporting) {
      const projectName = record.sourceSection || "Projects & systems";
      const current = grouped.get(projectName) ?? { descriptions: [], evidenceIds: [] };
      if (!current.descriptions.includes(claim.text)) current.descriptions.push(clean(claim.text));
      current.evidenceIds.push(record.id);
      grouped.set(projectName, current);
    }
  }
  return [...grouped.entries()].slice(0, 3).map(([name, project]) => ({
    name,
    description: project.descriptions.join(" ").slice(0, 650),
    evidenceIds: [...new Set(project.evidenceIds)],
  }));
}

function value(profile: CanonicalCareerProfile, id: string) {
  const record = profile.records.find((item) => item.id === id);
  const effective = record ? effectiveEvidenceValue(record) : null;
  return record && effective ? { record, value: clean(effective) } : null;
}

export function reviewedResumeRoles(profile: CanonicalCareerProfile) {
  const reviewed = profile.records.map((record) => {
    const effective = effectiveEvidenceValue(record);
    return effective ? { record, value: clean(effective) } : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const heading = /^(experience|employment|career|professional|executive|impact|history)(?:\s*[&/]\s*\w+)*$/i;
  return reviewed.flatMap((item, index) => {
    const match = item.value.match(/^(.*?)\s*\|\s*((?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current))$/i);
    if (!match) return [];
    if (/\b(college|academy|institute|school|university|degree|dean'?s list|education|training|licens|certif)\b/i.test(match[1])) return [];
    const employer = reviewed.slice(Math.max(0, index - 3), index).reverse().find((candidate) =>
      candidate.value.length <= 160
      && !heading.test(candidate.value)
      && !/\|\s*(?:19|20)\d{2}/.test(candidate.value)
      && !/^(?:19|20)\d{2}\s*[-–—]/.test(candidate.value),
    );
    if (!employer) return [];
    return [{
      employer: employer.value,
      title: match[1].trim(),
      location: undefined,
      dates: match[2].replace(/\s*[-–—]\s*/, " - "),
      evidenceIds: [employer.record.id, item.record.id],
    }];
  });
}

function reviewedResumeEducation(profile: CanonicalCareerProfile): string[] {
  return profile.records.flatMap((record) => {
    const effective = effectiveEvidenceValue(record);
    if (!effective) return [];
    const normalized = clean(effective);
    if (!/\b(college|academy|institute|school|university|degree|dean'?s list|education|training|licens|certif)\b/i.test(normalized)) return [];
    if (!/\|\s*(?:(?:19|20)\d{2})(?:\s*[-–—]\s*(?:19|20)\d{2})?$/i.test(normalized)) return [];
    return [normalized.replace(/\s*\|\s*/g, " · ")];
  });
}

function currentRole(profile: CanonicalCareerProfile) {
  const legacy = value(profile, "verified_career_history_001");
  const legacyMatch = legacy?.value.match(/^Title:\s*(.*?)\s+Location:\s*(.*?)\s+Dates:\s*(.*)$/i);
  if (legacy && legacyMatch) {
    return {
      employer: legacy.record.sourceSection || "Current employer",
      title: legacyMatch[1],
      location: legacyMatch[2] || undefined,
      dates: legacyMatch[3],
      evidenceIds: [legacy.record.id],
    };
  }

  const roles = reviewedResumeRoles(profile);
  return roles.find((role) => /present|current/i.test(role.dates)) ?? roles[0] ?? null;
}

function valuesByPath(profile: CanonicalCareerProfile, prefix: string) {
  return profile.records
    .filter((record) => record.path.startsWith(prefix))
    .map((record) => {
      const effective = effectiveEvidenceValue(record);
      return effective ? { record, value: clean(effective) } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function evidenceList(value: string): string[] {
  return value
    .replace(/^[^:]{2,80}:\s*/, "")
    .split(/;|\.(?:\s+|$)/)
    .map((item) => clean(item).replace(/^and\s+/i, "").replace(/[.;]+$/, ""))
    .filter((item) => item.length > 2);
}

function fallbackArtDirection(application: ArchivedApplication) {
  const role = `${application.opportunity.positionTitle} ${application.opportunity.description}`.toLowerCase();
  if (/\b(technology|engineering|systems|data|digital|software)\b/.test(role)) {
    return { palette: "teal" as const, density: "compact" as const, motif: "rail" as const, icons: true, iconSet: "technical" as const, iconTreatment: "outline" as const, rationale: "Technical precision with a modern operational structure." };
  }
  if (/\b(government|public|compliance|regulatory|federal)\b/.test(role)) {
    return { palette: "navy" as const, density: "balanced" as const, motif: "line" as const, icons: true, iconSet: "professional" as const, iconTreatment: "outline" as const, rationale: "Formal public-service tone with restrained visual navigation." };
  }
  if (/\b(construction|facilities|maintenance|operations|logistics)\b/.test(role)) {
    return { palette: "forest" as const, density: "balanced" as const, motif: "blocks" as const, icons: true, iconSet: "operations" as const, iconTreatment: "badge" as const, rationale: "Grounded operational leadership with clear structural emphasis." };
  }
  return { palette: "plum" as const, density: "editorial" as const, motif: "line" as const, icons: true, iconSet: "executive" as const, iconTreatment: "outline" as const, rationale: "Polished leadership presentation tailored to the opportunity." };
}

export function buildStructuredResume(
  application: ArchivedApplication,
  profile: CanonicalCareerProfile,
  identity: DocumentIdentity,
  themeId: DocumentThemeId,
  paletteOverride?: DocumentPalette,
): StructuredResume {
  const verified = application.draft.claims.filter((claim) => claim.decision === "verified");
  if (application.status !== "review_complete" || !verified.length) {
    throw new Error("Complete factual review before previewing or exporting a résumé.");
  }
  const currentEvidenceIds = new Set(profile.records
    .filter((record) => effectiveEvidenceValue(record) !== null)
    .map((record) => record.id));
  if (verified.some((claim) => claim.evidenceIds.some((id) => !currentEvidenceIds.has(id)))) {
    throw new Error("Regenerate the AI draft because one or more supporting career records were corrected or removed.");
  }
  const current = currentRole(profile);
  if (!current) throw new Error("Confirmed current-role metadata is incomplete. Add a current employer and a title with dates through the career evidence review.");
  const posting = `${application.opportunity.positionTitle} ${application.opportunity.description}`.toLowerCase();
  const skills = [
    ...["skills_001", "skills_002", "skills_003"]
      .map((id) => value(profile, id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    ...valuesByPath(profile, "capabilities.user_added"),
  ]
    .map((item) => ({
      ...item,
      score: item.value.toLowerCase().split(/\W+/).filter((word) => word.length > 4 && posting.includes(word)).length,
    }))
    .sort((left, right) => right.score - left.score);
  const fallbackExpertise = skills.slice(0, 2).flatMap((item) => item.value.split(";"))
    .map((item) => clean(item).replace(/[.;]+$/, "")).filter(Boolean).slice(0, 16);
  const legacyEarlier = ["verified_career_history_018", "verified_career_history_019", "verified_career_history_020"]
    .map((id) => value(profile, id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map(({ record, value: roleValue }) => {
      const parts = roleValue.split(/\s+-\s+/);
      return {
        employer: parts[0] || record.sourceSection || "Earlier employer",
        title: parts[1] || "Earlier role",
        dates: (parts.slice(2).join(" - ") || "Dates confirmed in canonical record").replace(/[.;]+$/, ""),
        highlights: [],
        evidenceIds: [record.id],
      };
    });
  const importedEarlier = reviewedResumeRoles(profile)
    .filter((role) => !current.evidenceIds.includes(role.evidenceIds.at(-1) ?? ""))
    .map((role) => ({ ...role, highlights: [] }));
  const earlier = legacyEarlier.length ? legacyEarlier : importedEarlier;
  const education = [
    value(profile, "education_credentials_001"),
    ...valuesByPath(profile, "education.user_added"),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const importedEducation = reviewedResumeEducation(profile);
  const credentials = valuesByPath(profile, "credentials.user_added")
    .flatMap((item) => evidenceList(item.value));
  const resumeClaims = verified.filter((claim) => !claim.kind || claim.kind === "resume_bullet");
  const projectEvidenceIds = new Set(profile.records.filter((record) => record.path.startsWith("projects.")).map((record) => record.id));
  const roleClaims = resumeClaims.filter((claim) => !claim.evidenceIds.some((id) => projectEvidenceIds.has(id)));
  const expertise = tailoredCompetencies(
    [application.draft.summary, ...resumeClaims.map((claim) => claim.text)].join("\n"),
    fallbackExpertise,
  );
  const metricEvidenceIds = new Set(profile.records
    .filter((record) => record.path.startsWith("metrics."))
    .map((record) => record.id));
  const metrics = verifiedMetricCallouts(resumeClaims, metricEvidenceIds);
  const linkedIn = profile.records.find((record) => /linkedin/i.test(record.path));
  const linkedInValue = linkedIn ? effectiveEvidenceValue(linkedIn) : null;
  const evidenceIds = [...new Set([
    ...verified.flatMap((claim) => claim.evidenceIds),
    ...current.evidenceIds,
    ...earlier.flatMap((role) => role.evidenceIds),
    ...skills.slice(0, 2).map((item) => item.record.id),
    ...education.map((item) => item.record.id),
    ...valuesByPath(profile, "credentials.user_added").map((item) => item.record.id),
    ...valuesByPath(profile, "capabilities.user_added").map((item) => item.record.id),
  ])];
  return structuredResumeSchema.parse({
    schemaVersion: 1,
    applicationId: application.id,
    applicationRevision: application.revision,
    themeId,
    artDirection: {
      ...(application.draft.generation?.visualDirection ?? fallbackArtDirection(application)),
      ...(paletteOverride ? { palette: paletteOverride } : {}),
    },
    identity,
    contactLinks: linkedInValue && /^https:\/\//i.test(linkedInValue)
      ? [{ label: "LinkedIn", url: linkedInValue }]
      : [],
    targetTitle: clean(application.opportunity.positionTitle).replace(/\s*-\s*job post.*$/i, ""),
    targetPositioning: {
      employer: clean(application.opportunity.companyName),
      location: formatJobLocation(clean(application.opportunity.location || "Location not specified")),
    },
    summary: resumeSummary(application.draft.summary),
    expertise,
    competencyGroups: groupCompetencies(expertise),
    experience: [{
      employer: current.employer,
      title: current.title,
      ...(current.location ? { location: current.location } : {}),
      dates: current.dates,
      highlights: roleClaims.map((claim) => clean(claim.text)),
      evidenceIds: [...new Set(roleClaims.flatMap((claim) => claim.evidenceIds).concat(current.evidenceIds))],
    }, ...earlier],
    secondaryExpertise: (skills[1]?.value ?? "").split(";").map(clean).filter(Boolean),
    education: [...new Set([
      ...education.map((item) => item.value.replace(/^Plaza College:\s*/i, "Plaza College - ")),
      ...importedEducation,
    ])],
    projectsAndSystems: relevantProjects(profile, resumeClaims),
    credentials,
    verifiedMetrics: metrics,
    optionalVisuals: {
      sectionIcons: themeId !== "ats_classic",
      competencyBlocks: themeId === "modern" || themeId === "technical",
      metricCallouts: metrics.length > 0 && themeId !== "ats_classic",
    },
    generatedFromEvidenceIds: evidenceIds,
  });
}
