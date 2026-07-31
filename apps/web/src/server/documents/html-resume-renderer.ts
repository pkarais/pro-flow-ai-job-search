import type { DocumentThemeId, StructuredResume } from "@pro-flow/career-core";
import { resumeTemplates } from "./design/resume-templates.ts";

const themes: Record<DocumentThemeId, { ink: string; muted: string; paper: string; font: string }> = {
  executive: { ink: "#18222d", muted: "#526170", paper: "#fff", font: "Arial, Helvetica, sans-serif" },
  technical: { ink: "#14252a", muted: "#53676c", paper: "#fbfdfd", font: "\"Segoe UI\", Arial, sans-serif" },
  ats_classic: { ink: "#111", muted: "#444", paper: "#fff", font: "Arial, Helvetica, sans-serif" },
  government: { ink: "#172434", muted: "#526274", paper: "#fff", font: "Georgia, \"Times New Roman\", serif" },
  modern: { ink: "#211b27", muted: "#675f6d", paper: "#fffefe", font: "\"Segoe UI\", Arial, sans-serif" },
};
const accents = { navy: "#17324d", teal: "#006d77", plum: "#5a3f75", slate: "#394b59", forest: "#285943", burgundy: "#7a263a" };

export function renderDesignedResumeHtml(resume: StructuredResume): string {
  const base = themes[resume.themeId];
  const accent = accents[resume.artDirection.palette];
  const designed = resume.themeId !== "ats_classic";
  const icons = designed && resume.artDirection.icons;
  const density = resume.artDirection.density === "compact"
    ? { body: "9.8pt", gap: "22px", section: "14px" }
    : resume.artDirection.density === "editorial"
      ? { body: "10.5pt", gap: "32px", section: "21px" }
      : { body: "10.2pt", gap: "28px", section: "18px" };
  const body = resumeTemplates[resume.themeId](resume, icons);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <style>
  @page{size:Letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8ebef;color:${base.ink};font-family:${base.font};font-size:${density.body};line-height:1.38}
  .sheet{width:8.5in;min-height:11in;margin:24px auto;background:${base.paper};box-shadow:0 18px 55px #18222d24;padding:.58in .62in}
  header{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:end;border-bottom:3px solid ${accent};padding-bottom:16px;margin-bottom:18px}
  h1{font-size:28pt;line-height:1;margin:0;color:${accent};letter-spacing:-.035em}header h2{font-size:12pt;margin:8px 0 0;text-transform:uppercase;letter-spacing:.12em}
  .contact{font-size:9.5pt;color:${base.muted};text-align:right}.contact span{display:flex;justify-content:flex-end;align-items:center;gap:6px;margin-top:4px}
  .layout{display:grid;grid-template-columns:${designed ? "1.82fr .78fr" : "1fr"};gap:${density.gap}}.side{border-left:${designed ? `1px solid ${accent}33` : "0"};padding-left:${designed ? "20px" : "0"}}
  section{break-inside:avoid;margin:0 0 ${density.section}}h2.section{display:flex;align-items:center;gap:7px;font-size:10pt;letter-spacing:.13em;text-transform:uppercase;color:${accent};margin:0 0 9px}
  .icon{display:inline-grid;place-items:center;flex:0 0 auto}.icon svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.contact .icon svg{width:13px;height:13px}.icon-badge{width:23px;height:23px;border-radius:50%;background:${accent};color:#fff}.icon-badge svg{width:13px;height:13px}.icon-solid svg{fill:currentColor;stroke-width:1.2}
  .summary{font-size:10.6pt;margin:0}.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{border:1px solid ${accent}55;background:${accent}0b;border-radius:999px;padding:4px 8px;font-size:8.7pt}
  .role{break-inside:avoid;margin-bottom:17px}.role-heading{display:flex;justify-content:space-between;gap:16px}.role h3{font-size:11.4pt;margin:0}.role p,.role time{color:${base.muted};font-size:9.2pt;margin:2px 0 0}.role time{white-space:nowrap}
  ul{margin:8px 0 0;padding-left:17px}li{margin:0 0 5px}.side p{margin:0 0 8px;font-size:9.2pt}
  .motif-blocks h2.section{background:${accent}10;padding:6px 8px;border-radius:4px}.motif-rail header{border-left:6px solid ${accent};padding-left:16px;border-bottom-width:1px}.motif-minimal .chip{border-radius:2px;background:transparent}
  .theme-executive{border-top:10px solid ${accent};padding-top:.46in}.theme-executive header{border-bottom-width:1px}.theme-executive h1{font-family:Georgia,"Times New Roman",serif;font-size:30pt}.theme-executive .layout{grid-template-columns:1.65fr .72fr}.theme-executive .side{background:${accent}0a;border-left:0;padding:18px}.theme-executive h2.section{letter-spacing:.09em}
  .theme-technical{border-left:12px solid ${accent};padding-left:.5in}.theme-technical header{border-bottom:0;border-left:0;padding-left:0}.theme-technical header h2,.theme-technical h2.section{font-family:Consolas,"Courier New",monospace}.theme-technical .layout{grid-template-columns:1.72fr .82fr}.theme-technical .side{background:${accent}0c;border:1px solid ${accent}24;padding:18px}.theme-technical .chip{border-radius:3px}
  .theme-ats_classic{padding:.7in .78in}.theme-ats_classic header{display:block;text-align:center;border-bottom:1px solid #111}.theme-ats_classic .contact{text-align:center;margin-top:8px}.theme-ats_classic .contact span{display:inline;margin:0 7px}.theme-ats_classic h1{color:#111;font-family:Arial,sans-serif;font-size:24pt;letter-spacing:0}.theme-ats_classic .layout{display:block}.theme-ats_classic .side{border:0;padding:0}.theme-ats_classic .chips{display:block}.theme-ats_classic .chip{display:inline;border:0;background:none;padding:0}.theme-ats_classic .chip:not(:last-child)::after{content:" • ";padding:0 4px}.theme-ats_classic h2.section{color:#111;border-bottom:1px solid #111;padding-bottom:4px}
  .theme-government{padding:.66in .72in}.theme-government header{display:block;border-top:5px double ${accent};border-bottom:2px solid ${accent};padding-top:14px}.theme-government h1{font-family:Georgia,"Times New Roman",serif;font-size:25pt;letter-spacing:0}.theme-government .contact{text-align:left;margin-top:9px}.theme-government .contact span{display:inline-flex;margin-right:15px}.theme-government .layout{display:block}.theme-government .side{display:grid;grid-template-columns:1fr 1fr;gap:22px;border:0;border-top:1px solid ${accent}55;padding:16px 0 0}.theme-government .chip{border-radius:0;background:transparent;border-color:${accent}44}
  .theme-modern{padding:.5in}.theme-modern header{margin:-.5in -.5in 22px;padding:.48in .5in 20px;background:${accent};color:#fff;border:0}.theme-modern h1,.theme-modern header h2,.theme-modern .contact{color:#fff}.theme-modern h1{font-size:31pt}.theme-modern .layout{grid-template-columns:1.9fr .68fr}.theme-modern .side{border-left:3px solid ${accent};padding-left:18px}.theme-modern h2.section{font-size:9.5pt}.theme-modern .chip{border:0;background:${accent}12}
  a{color:inherit}.positioning,.technical-kicker{margin:0 0 7px;text-transform:uppercase;letter-spacing:.14em;font-size:8.5pt;font-weight:700}.executive-layout{display:grid;grid-template-columns:.75fr 1.65fr;gap:32px}.executive-layout>aside{background:${accent}0a;padding:20px}.executive-layout>main{min-width:0}
  .competency-group{margin-bottom:11px}.competency-group h3,.projects h3{font-size:9.5pt;margin:0 0 3px}.competency-group p,.projects p{font-size:9pt;margin:0}.competency-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.competency-grid .competency-group{border:1px solid ${accent}33;background:${accent}09;padding:10px;margin:0}
  .metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 18px}.metric{border-left:3px solid ${accent};padding:5px 9px}.metric strong{display:block;color:${accent};font-size:16pt}.metric span{font-size:8pt;color:${base.muted}}
  .modern-summary{display:grid;grid-template-columns:.35fr 1.65fr;gap:20px;align-items:start}.modern-layout{display:grid;grid-template-columns:1.7fr .75fr;gap:28px}.modern-layout>aside{border-left:1px solid ${accent}44;padding-left:18px}
  .technical-header .contact{display:flex;gap:16px;margin-top:10px;text-align:left}.technical-header .contact span{justify-content:flex-start}.technical-layout{display:grid;grid-template-columns:.8fr 1.6fr;gap:30px}.technical-layout>aside{background:${accent}0c;border:1px solid ${accent}2b;padding:18px}.technical-layout .competency-grid{grid-template-columns:1fr}
  .ats-header{text-align:center}.ats-header .contact{display:flex;justify-content:center;gap:14px}.government-header>p{font-weight:700}.qualifications{border:1px solid ${accent}44;padding:16px}.federal-notice{border-top:1px solid ${accent};padding-top:8px;font-size:8pt;color:${base.muted}}
  @media(max-width:900px){body{background:#f1f3f5}.sheet{width:100%;min-height:auto;margin:0;box-shadow:none;padding:32px 24px}.layout,.theme-executive .layout,.theme-technical .layout,.theme-modern .layout,.executive-layout,.modern-layout,.technical-layout,.modern-summary{grid-template-columns:1fr}.competency-grid{grid-template-columns:1fr}.side{border-left:0;padding-left:0}header{grid-template-columns:1fr}.contact{text-align:left}.contact span{justify-content:flex-start}.theme-modern header{margin:-32px -24px 22px;padding:32px 24px 20px}.theme-government .side{grid-template-columns:1fr}}
  @media print{body{background:#fff}.sheet{margin:0;box-shadow:none;width:8.5in;min-height:11in}}
  </style></head><body><main class="sheet theme-${resume.themeId} motif-${resume.artDirection.motif}">${body}</main></body></html>`;
}
