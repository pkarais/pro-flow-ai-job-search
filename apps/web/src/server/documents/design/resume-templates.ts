import type { DocumentThemeId, StructuredResume } from "@pro-flow/career-core";
import { resumeIcon, sectionIcon } from "./icon-registry.ts";
import { formatUsPhone } from "../phone-format.ts";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");

function contact(resume: StructuredResume, icons: boolean) {
  const treatment = resume.artDirection.iconTreatment;
  return `<div class="contact"><span>${resumeIcon("mail", icons, treatment)}${escape(resume.identity.email)}</span><span>${resumeIcon("phone", icons, treatment)}${escape(formatUsPhone(resume.identity.phone))}</span>${resume.contactLinks.map((link) => `<span>${resumeIcon("linkedin", icons, treatment)}<a href="${escape(link.url)}">${escape(link.label)}</a></span>`).join("")}</div>`;
}

function heading(resume: StructuredResume, label: string, section: "profile" | "experience" | "expertise" | "education", icons: boolean) {
  return `<h2 class="section">${sectionIcon(resume.artDirection.iconSet, section, icons, resume.artDirection.iconTreatment)}${label}</h2>`;
}

function roles(resume: StructuredResume) {
  return resume.experience.map((role) => `<article class="role"><div class="role-heading"><div><h3>${escape(role.title)}</h3><p>${escape(role.employer)}${role.location ? ` &middot; ${escape(role.location)}` : ""}</p></div><time>${escape(role.dates)}</time></div>${role.highlights.length ? `<ul>${role.highlights.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>` : ""}</article>`).join("");
}

function competencies(resume: StructuredResume, blocks = false) {
  return `<div class="${blocks ? "competency-grid" : "competency-list"}">${resume.competencyGroups.map((group) => `<section class="competency-group"><h3>${escape(group.label)}</h3><p>${group.items.map(escape).join(" · ")}</p></section>`).join("")}</div>`;
}

function projects(resume: StructuredResume) {
  if (!resume.projectsAndSystems.length) return "";
  return `<section class="projects"><h2 class="section">Projects &amp; systems</h2>${resume.projectsAndSystems.map((project) => `<article><h3>${escape(project.name)}</h3><p>${escape(project.description)}</p></article>`).join("")}</section>`;
}

function credentials(resume: StructuredResume, icons: boolean) {
  if (!resume.education.length && !resume.credentials.length) return "";
  return `<section>${heading(resume, "Education & credentials", "education", icons)}${resume.education.map((item) => `<p class="education-item">${escape(item)}</p>`).join("")}${resume.credentials.length ? `<ul class="credential-list">${resume.credentials.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>` : ""}</section>`;
}

function metrics(resume: StructuredResume) {
  if (!resume.optionalVisuals.metricCallouts || !resume.verifiedMetrics.length) return "";
  return `<div class="metric-grid">${resume.verifiedMetrics.map((metric) => `<div class="metric"><strong>${escape(metric.value)}</strong><span>${escape(metric.label)}</span></div>`).join("")}</div>`;
}

function executive(resume: StructuredResume, icons: boolean) {
  return `<header class="executive-header"><div><p class="positioning">Operations &bull; Infrastructure &bull; Organizational leadership</p><h1>${escape(resume.identity.fullName)}</h1><h2>${escape(resume.targetTitle)}</h2><p class="target-employer">Prepared for ${escape(resume.targetPositioning.employer)}</p></div>${contact(resume, icons)}</header>
  <div class="executive-capability-strip">${resume.expertise.slice(0, 5).map((item, index) => `<div class="executive-capability">${resumeIcon((["operations", "facilities", "leadership", "technology", "compliance"] as const)[index], icons, "outline")}<span>${escape(item)}</span></div>`).join("")}</div>
  ${metrics(resume)}<div class="executive-layout"><aside>${heading(resume, "Executive profile", "profile", icons)}<p class="summary">${escape(resume.summary)}</p>${heading(resume, "Leadership capabilities", "expertise", icons)}${competencies(resume)}${credentials(resume, icons)}</aside><main>${heading(resume, "Professional experience", "experience", icons)}${roles(resume)}${projects(resume)}</main></div>`;
}

function modern(resume: StructuredResume, icons: boolean) {
  return `<header class="modern-header"><div><h1>${escape(resume.identity.fullName)}</h1><h2>${escape(resume.targetTitle)}</h2><p>${escape(resume.targetPositioning.employer)} · ${escape(resume.targetPositioning.location)}</p></div>${contact(resume, icons)}</header>
  <section class="modern-summary">${heading(resume, "Profile", "profile", icons)}<p class="summary">${escape(resume.summary)}</p></section>${metrics(resume)}${heading(resume, "Competency portfolio", "expertise", icons)}${competencies(resume, true)}
  <div class="modern-layout"><main>${heading(resume, "Experience", "experience", icons)}${roles(resume)}</main><aside>${projects(resume)}${credentials(resume, icons)}</aside></div>`;
}

function technical(resume: StructuredResume, icons: boolean) {
  return `<header class="technical-header"><div class="technical-kicker">SYSTEMS / OPERATIONS / DELIVERY</div><h1>${escape(resume.identity.fullName)}</h1><h2>${escape(resume.targetTitle)}</h2>${contact(resume, icons)}</header>
  <div class="technical-layout"><aside>${heading(resume, "Technical domains", "expertise", icons)}${competencies(resume, true)}${projects(resume)}${credentials(resume, icons)}</aside><main>${heading(resume, "Systems profile", "profile", icons)}<p class="summary">${escape(resume.summary)}</p>${heading(resume, "Experience", "experience", icons)}${roles(resume)}</main></div>`;
}

function ats(resume: StructuredResume) {
  return `<header class="ats-header"><h1>${escape(resume.identity.fullName)}</h1><h2>${escape(resume.targetTitle)}</h2>${contact(resume, false)}</header>
  <section><h2 class="section">Professional summary</h2><p class="summary">${escape(resume.summary)}</p></section><section><h2 class="section">Core competencies</h2>${competencies(resume)}</section>
  <section><h2 class="section">Professional experience</h2>${roles(resume)}</section>${projects(resume)}${credentials(resume, false)}`;
}

function publicSector(resume: StructuredResume, icons: boolean) {
  return `<header class="government-header"><h1>${escape(resume.identity.fullName)}</h1><h2>${escape(resume.targetTitle)}</h2><p>Target: ${escape(resume.targetPositioning.employer)} · ${escape(resume.targetPositioning.location)}</p>${contact(resume, icons)}</header>
  <section class="qualifications">${heading(resume, "Qualifications summary", "profile", icons)}<p class="summary">${escape(resume.summary)}</p>${competencies(resume)}</section>
  <section>${heading(resume, "Relevant professional experience", "experience", icons)}${roles(resume)}</section>${projects(resume)}${credentials(resume, icons)}`;
}

export const resumeTemplates: Record<DocumentThemeId, (resume: StructuredResume, icons: boolean) => string> = {
  executive,
  modern,
  technical,
  ats_classic: ats,
  government: publicSector,
};
