"use client";

import { useState, type ReactNode } from "react";
import type { CompanyInsightRecord } from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

export function InsightsWorkspace({ reports }: { reports: CompanyInsightRecord[] }) {
  const ordered = [...reports].sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  const companyReports = ordered.filter((report) => report.kind === "company_overview");
  const directReports = ordered.filter((report) => report.kind === "direct_application");
  const [selectedId, setSelectedId] = useState(companyReports[0]?.id ?? ordered[0]?.id ?? "");
  const selected = ordered.find((report) => report.id === selectedId);
  return <div className="operations-page">
    <header className="operations-hero">
      <StatusBadge tone="current">AI insights · Company research</StatusBadge>
      <p className="eyebrow">Employer intelligence library</p>
      <h1>Understand the companies behind your applications.</h1>
      <p>Open saved company reports or direct-application research. Current web research, uncertainty labels, and clickable sources remain attached to each result.</p>
    </header>
    <section className="operations-section">
      <SectionHeading eyebrow="Saved company insights" title="Choose a generated report" description="Generate company overviews or direct-application research from a saved job on the Find Jobs page." />
      <SurfaceCard className="operations-card">
        {ordered.length ? <>
          <label>Report, company, and role
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {companyReports.length ? <optgroup label="Company overviews">
                {companyReports.map((report) => <option value={report.id} key={report.id}>Company overview · {report.company} · {new Date(report.generatedAt).toLocaleString()}</option>)}
              </optgroup> : null}
              {directReports.length ? <optgroup label="Direct application options">
                {directReports.map((report) => <option value={report.id} key={report.id}>Direct application · {report.company} · {new Date(report.generatedAt).toLocaleString()}</option>)}
              </optgroup> : null}
            </select>
          </label>
          {selected ? <CompanyInsight report={selected} /> : null}
        </> : <p>No research has been generated yet. Open Find Jobs and choose a research action on a saved posting.</p>}
      </SurfaceCard>
    </section>
  </div>;
}

function CompanyInsight({ report }: { report: CompanyInsightRecord }) {
  const sources = [...new Map(report.citations.map((citation) => [citation.url, citation])).values()];
  return <article className="company-insight-report">
    <StatusBadge tone="current">{report.kind === "direct_application" ? "Direct application research" : "AI company research"} · web cited</StatusBadge>
    <h3>{report.company}</h3>
    <p><strong>Role context:</strong> {report.role}</p>
    {report.kind === "company_overview" && !/market compensation estimate/i.test(report.report) ? <p className="form-warning"><strong>Salary analysis not present:</strong> This report predates the compensation upgrade. Generate updated company insights from the saved job card to add it.</p> : null}
    <div className="company-insight-copy"><CitedCompanyReport report={report} /></div>
    <h4>Sources</h4>
    <ol>{sources.map((source) => <li key={source.url}><a className="text-link" href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ol>
    <small>Generated {new Date(report.generatedAt).toLocaleString()} · Verify the destination and recipient before applying.</small>
  </article>;
}

function CitedCompanyReport({ report }: { report: CompanyInsightRecord }) {
  const citations = [...report.citations].sort((left, right) => left.startIndex - right.startIndex);
  const content: ReactNode[] = [];
  let cursor = 0;
  for (const citation of citations) {
    if (citation.startIndex < cursor || citation.endIndex > report.report.length) continue;
    content.push(report.report.slice(cursor, citation.startIndex));
    content.push(<a className="text-link" href={citation.url} key={`${citation.url}-${citation.startIndex}`} target="_blank" rel="noreferrer">{report.report.slice(citation.startIndex, citation.endIndex) || citation.title}</a>);
    cursor = citation.endIndex;
  }
  content.push(report.report.slice(cursor));
  return <>{content}</>;
}
