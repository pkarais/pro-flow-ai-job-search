export type ResumeIconName =
  | "mail" | "phone" | "location" | "website" | "linkedin"
  | "profile" | "experience" | "expertise" | "education" | "certification"
  | "award" | "language" | "project" | "leadership" | "operations"
  | "facilities" | "engineering" | "maintenance" | "construction" | "logistics"
  | "compliance" | "safety" | "technology" | "data" | "finance"
  | "sales" | "marketing" | "healthcare" | "government" | "security"
  | "sustainability";

const icons: Record<ResumeIconName, string> = {
  mail: "<path d=\"M3 5h18v14H3z\"/><path d=\"m3 6 9 7 9-7\"/>",
  phone: "<path d=\"M7 3h3l2 5-2 2a16 16 0 0 0 4 4l2-2 5 2v3c0 2-2 4-4 4C9 20 4 15 3 7c0-2 2-4 4-4z\"/>",
  location: "<path d=\"M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>",
  website: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18\"/>",
  linkedin: "<path d=\"M5 9v10M5 5v.1M10 19V9h4v2c2-3 5-2 5 2v6\"/>",
  profile: "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c1-5 4-7 8-7s7 2 8 7\"/>",
  experience: "<path d=\"M4 7h16v13H4z\"/><path d=\"M9 7V4h6v3M4 12h16\"/>",
  expertise: "<path d=\"m12 3 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z\"/>",
  education: "<path d=\"m3 9 9-5 9 5-9 5z\"/><path d=\"M7 12v5c3 2 7 2 10 0v-5\"/>",
  certification: "<circle cx=\"12\" cy=\"10\" r=\"6\"/><path d=\"m9 16-1 5 4-2 4 2-1-5\"/>",
  award: "<path d=\"M8 3h8v5a4 4 0 0 1-8 0zM6 5H3c0 4 2 6 6 6M18 5h3c0 4-2 6-6 6M12 12v5M8 21h8M9 17h6\"/>",
  language: "<path d=\"M4 5h10M9 3v2c0 6-3 9-6 10M6 9c2 3 5 5 8 6M15 10h3l3 11M16 17h4\"/>",
  project: "<path d=\"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z\"/>",
  leadership: "<circle cx=\"12\" cy=\"7\" r=\"3\"/><circle cx=\"5\" cy=\"10\" r=\"2\"/><circle cx=\"19\" cy=\"10\" r=\"2\"/><path d=\"M7 21v-3c0-3 2-5 5-5s5 2 5 5v3M2 20v-2c0-2 1-4 3-4M22 20v-2c0-2-1-4-3-4\"/>",
  operations: "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2\"/>",
  facilities: "<path d=\"M4 21V8l8-5 8 5v13M8 21v-6h8v6M8 10h2M14 10h2\"/>",
  engineering: "<path d=\"m14 6 4-3 3 3-3 4M13 7 4 16l-1 5 5-1 9-9\"/>",
  maintenance: "<path d=\"M14 6a5 5 0 0 0-7 6L3 16l5 5 4-4a5 5 0 0 0 6-7l-3 3-3-3z\"/>",
  construction: "<path d=\"M4 21V8h10v13M14 12h6v9M7 11h4M7 15h4M7 19h4M17 15h1M17 18h1\"/>",
  logistics: "<path d=\"M3 6h12v11H3zM15 10h4l2 4v3h-6z\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/><circle cx=\"18\" cy=\"18\" r=\"2\"/>",
  compliance: "<path d=\"M12 3 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6z\"/><path d=\"m8 12 3 3 5-6\"/>",
  safety: "<path d=\"M12 3 3 20h18z\"/><path d=\"M12 9v5M12 17v.1\"/>",
  technology: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"13\" rx=\"1\"/><path d=\"M8 21h8M12 17v4\"/>",
  data: "<ellipse cx=\"12\" cy=\"5\" rx=\"8\" ry=\"3\"/><path d=\"M4 5v6c0 2 4 3 8 3s8-1 8-3V5M4 11v6c0 2 4 3 8 3s8-1 8-3v-6\"/>",
  finance: "<path d=\"M4 8h16M6 8v10M10 8v10M14 8v10M18 8v10M3 21h18M12 3l9 5H3z\"/>",
  sales: "<path d=\"M4 19 10 13l4 3 6-9\"/><path d=\"M15 7h5v5\"/>",
  marketing: "<path d=\"m3 11 14-6v14L3 13zM7 14l2 6h4l-2-5\"/>",
  healthcare: "<path d=\"M12 21S4 16 4 9a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 7-8 12-8 12z\"/><path d=\"M9 11h6M12 8v6\"/>",
  government: "<path d=\"M3 9h18M5 9v9M10 9v9M14 9v9M19 9v9M2 21h20M12 3l10 5H2z\"/>",
  security: "<rect x=\"5\" y=\"10\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3M12 14v3\"/>",
  sustainability: "<path d=\"M20 4C10 4 5 9 5 16c7 1 13-4 15-12z\"/><path d=\"M4 21c3-6 7-9 13-13\"/>",
};

export type IconSet = "classic" | "professional" | "technical" | "operations" | "executive" | "minimal";
export type IconTreatment = "outline" | "badge" | "solid";

const sectionSets: Record<IconSet, { profile: ResumeIconName; experience: ResumeIconName; expertise: ResumeIconName; education: ResumeIconName }> = {
  classic: { profile: "profile", experience: "experience", expertise: "expertise", education: "education" },
  professional: { profile: "profile", experience: "experience", expertise: "certification", education: "education" },
  technical: { profile: "technology", experience: "project", expertise: "engineering", education: "certification" },
  operations: { profile: "leadership", experience: "operations", expertise: "maintenance", education: "certification" },
  executive: { profile: "leadership", experience: "experience", expertise: "award", education: "education" },
  minimal: { profile: "profile", experience: "experience", expertise: "expertise", education: "education" },
};

export function resumeIcon(name: ResumeIconName, enabled: boolean, treatment: IconTreatment = "outline"): string {
  if (!enabled) return "";
  return `<span class="icon icon-${treatment}"><svg aria-hidden="true" viewBox="0 0 24 24">${icons[name]}</svg></span>`;
}

export function sectionIcon(set: IconSet, section: keyof (typeof sectionSets)["classic"], enabled: boolean, treatment: IconTreatment): string {
  return resumeIcon(sectionSets[set][section], enabled, treatment);
}

export const resumeIconNames = Object.freeze(Object.keys(icons) as ResumeIconName[]);
