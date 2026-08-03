import type { StructuredResume } from "@pro-flow/career-core";
import { formatUsPhone } from "./phone-format.ts";

const accents = { navy: "#17324d", teal: "#006d77", plum: "#5a3f75", slate: "#394b59", forest: "#285943", burgundy: "#7a263a" };
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function renderDesignedCoverLetterHtml(resume: StructuredResume, letter: string, signatureDataUri?: string | null): string {
  const accent = accents[resume.artDirection.palette];
  const executive = resume.themeId === "executive";
  const gold = "#b7791f";
  const paragraphs = letter.split(/\n\s*\n/).map((item) => item.trim())
    .filter((item) => item && !/^dear hiring manager,?$/i.test(item) && !/^sincerely,?$/i.test(item) && item !== "[Your name]");
  const characterCount = paragraphs.join(" ").length;
  const compact = characterCount > 1_650 || paragraphs.length > 4;
  const tight = characterCount > 2_450;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:Letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8ebef;font-family:"Segoe UI",Arial,sans-serif;color:#1d252b;line-height:1.55}
  .sheet{position:relative;width:8.5in;min-height:11in;margin:24px auto;background:linear-gradient(135deg,#fff 0%,#fff 72%,${accent}07 100%);padding:.7in .78in;box-shadow:0 18px 55px #18222d24;border:1px solid ${accent};border-top:10px solid ${executive ? gold : accent};overflow:hidden}
  .brief-kicker{display:flex;align-items:center;gap:12px;margin:0 0 22px;color:${accent};font-family:Georgia,"Times New Roman",serif;font-size:8pt;font-weight:700;letter-spacing:.28em;text-transform:uppercase}.brief-kicker:before,.brief-kicker:after{content:"";height:1px;flex:1;background:${gold}}.brief-kicker b{color:${gold};font-size:13pt}
  header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid ${accent};padding-bottom:18px;margin-bottom:32px}h1{margin:0;color:${accent};font-size:25pt}header p{margin:5px 0 0}.contact{text-align:right;font-size:9.5pt}
  .recipient{margin-bottom:24px;color:#4d5b63}.letter{position:relative;z-index:1}.letter p{font-family:Georgia,"Times New Roman",serif;font-size:10.5pt;margin:0 0 15px}.signature{position:relative;z-index:1;margin-top:18px;break-inside:avoid;page-break-inside:avoid}.signature-image{display:block;width:1.78in;max-height:.54in;object-fit:contain;object-position:left bottom;margin:1px 0 -2px}.signature strong{display:inline-block;color:${accent};font-size:9.5pt;letter-spacing:.08em;text-transform:uppercase;border-top:1px solid ${gold};padding-top:4px;min-width:1.75in}
  .sheet.compact{padding:.48in .64in}.sheet.compact header{padding-bottom:11px;margin-bottom:18px}.sheet.compact h1{font-size:22pt}.sheet.compact .recipient{margin-bottom:14px}.sheet.compact .letter p{font-size:9.35pt;line-height:1.36;margin-bottom:9px}.sheet.compact .signature{margin-top:14px}
  .sheet.tight{padding:.38in .56in}.sheet.tight .brief-kicker{margin-bottom:12px}.sheet.tight header{margin-bottom:12px;padding-bottom:8px}.sheet.tight h1{font-size:19pt}.sheet.tight header p,.sheet.tight .contact{font-size:8.6pt}.sheet.tight .recipient{margin-bottom:9px;font-size:8.7pt}.sheet.tight .letter p{font-size:8.65pt;line-height:1.28;margin-bottom:7px}.sheet.tight .signature{margin-top:8px}.sheet.tight .signature-image{width:1.55in;max-height:.44in}.sheet.tight .signature strong{font-size:8.5pt;min-width:1.52in}
  ${executive ? `header{margin:0 0 26px;padding:0 0 18px;border-bottom:1px solid ${gold};color:${accent}}header h1{font-family:Georgia,"Times New Roman",serif;color:${accent};letter-spacing:.015em}.sheet.compact header{margin-bottom:18px;padding-bottom:12px}.signature strong{color:${accent}}` : ""}
  @media(max-width:900px){body{background:#fff}.sheet{width:100%;margin:0;box-shadow:none;padding:32px 24px}header{display:block}.contact{text-align:left;margin-top:12px}}
  @media print{body{background:#fff}.sheet{margin:0;box-shadow:none}}
  </style></head><body><main class="sheet${compact ? " compact" : ""}${tight ? " tight" : ""}">${executive ? `<div class="brief-kicker"><span>Executive application letter</span><b>&#9733;</b><span>${escape(resume.targetPositioning.employer)}</span></div>` : ""}<header><div><h1>${escape(resume.identity.fullName)}</h1><p>${escape(resume.targetTitle)}</p></div><div class="contact">${escape(resume.identity.email)}<br>${escape(formatUsPhone(resume.identity.phone))}</div></header>
  <div class="recipient"><strong>${escape(resume.targetPositioning.employer)}</strong><br>${escape(resume.targetPositioning.location)}</div>
  <div class="letter"><p>Dear Hiring Manager,</p>${paragraphs.map((item) => `<p>${escape(item)}</p>`).join("")}</div>
  <div class="signature">Sincerely,<br>${signatureDataUri ? `<img class="signature-image" src="${signatureDataUri}" alt="" aria-hidden="true">` : "<br>"}<strong>${escape(resume.identity.fullName)}</strong></div></main></body></html>`;
}
