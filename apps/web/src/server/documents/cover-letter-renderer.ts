import type { StructuredResume } from "@pro-flow/career-core";
import { formatUsPhone } from "./phone-format.ts";

const accents = { navy: "#17324d", teal: "#006d77", plum: "#5a3f75", slate: "#394b59", forest: "#285943", burgundy: "#7a263a" };
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function renderDesignedCoverLetterHtml(resume: StructuredResume, letter: string): string {
  const accent = accents[resume.artDirection.palette];
  const paragraphs = letter.split(/\n\s*\n/).map((item) => item.trim())
    .filter((item) => item && !/^dear hiring manager,?$/i.test(item) && !/^sincerely,?$/i.test(item) && item !== "[Your name]");
  const compact = paragraphs.join(" ").length > 2_200 || paragraphs.length > 5;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:Letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8ebef;font-family:"Segoe UI",Arial,sans-serif;color:#1d252b;line-height:1.55}
  .sheet{width:8.5in;min-height:11in;margin:24px auto;background:#fff;padding:.7in .78in;box-shadow:0 18px 55px #18222d24;border-top:10px solid ${accent}}
  header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid ${accent};padding-bottom:18px;margin-bottom:32px}h1{margin:0;color:${accent};font-size:25pt}header p{margin:5px 0 0}.contact{text-align:right;font-size:9.5pt}
  .recipient{margin-bottom:24px;color:#4d5b63}.letter p{font-size:10.8pt;margin:0 0 15px}.signature{margin-top:28px}.signature strong{color:${accent};font-size:12pt}
  .sheet.compact{padding:.48in .64in}.sheet.compact header{padding-bottom:11px;margin-bottom:18px}.sheet.compact h1{font-size:22pt}.sheet.compact .recipient{margin-bottom:14px}.sheet.compact .letter p{font-size:9.35pt;line-height:1.36;margin-bottom:9px}.sheet.compact .signature{margin-top:14px}
  @media(max-width:900px){body{background:#fff}.sheet{width:100%;margin:0;box-shadow:none;padding:32px 24px}header{display:block}.contact{text-align:left;margin-top:12px}}
  @media print{body{background:#fff}.sheet{margin:0;box-shadow:none}}
  </style></head><body><main class="sheet${compact ? " compact" : ""}"><header><div><h1>${escape(resume.identity.fullName)}</h1><p>${escape(resume.targetTitle)}</p></div><div class="contact">${escape(resume.identity.email)}<br>${escape(formatUsPhone(resume.identity.phone))}</div></header>
  <div class="recipient"><strong>${escape(resume.targetPositioning.employer)}</strong><br>${escape(resume.targetPositioning.location)}</div>
  <div class="letter"><p>Dear Hiring Manager,</p>${paragraphs.map((item) => `<p>${escape(item)}</p>`).join("")}</div>
  <div class="signature">Sincerely,<br><br><strong>${escape(resume.identity.fullName)}</strong></div></main></body></html>`;
}
