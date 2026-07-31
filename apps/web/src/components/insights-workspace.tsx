"use client";

import { useState, type ReactNode } from "react";
import type { CompanyInsightRecord } from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

export function InsightsWorkspace({ reports }: { reports: CompanyInsightRecord[] }) {
  const ordered = [...reports].sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  const [selectedId, setSelectedId] = useState(ordered[0]?.id ?? "");
  const selected = ordered.find((report) => report.id === selectedId);
  return <div className="operations-page">
    <header className="operations-hero">
      <StatusBadge tone="current">AI insights · Company research</StatusBadge>
      <p className="eyebrow">Employer intelligence library</p>
      <h1>Understand the companies behind your applications.</h1>
      <p>Open any previously generated report. Current web research, uncertainty labels, and clickable sources remain attached to each saved result.</p>
    </header>
    <section className="operations-section">
      <SectionHeading eyebrow="Saved company insights" title="Choose a generated report" description="Generate additional reports from a saved job on the Find Jobs page." />
      <SurfaceCard className="operations-card">
        {ordered.length ? <>
          <label>Company and role
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {ordered.map((report) => <option value={report.id} key={report.id}>{report.company} · {report.role} · {new Date(report.generatedAt).toLocaleDateString()}</option>)}
            </select>
          </label>
          {selected ? <CompanyInsight report={selected} /> : null}
        </> : <p>No company reports have been generated yet. Open Find Jobs and choose “Generate AI company insights” on a saved posting.</p>}
      </SurfaceCard>
    </section>
  </div>;
}

function CompanyInsight({ report }: { report: CompanyInsightRecord }) {
  const sources = [...new Map(report.citations.map((citation) => [citation.url, citation])).values()];
  return <article className="company-insight-report">
    <StatusBadge tone="current">AI researched · web cited</StatusBadge>
    <h3>{report.company}</h3>
    <p><strong>Role context:</strong> {report.role}</p>
    <div className="company-insight-copy"><CitedCompanyReport report={report} /></div>
    <h4>Sources</h4>
    <ol>{sources.map((source) => <li key={source.url}><a className="text-link" href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ol>
    <small>Generated {new Date(report.generatedAt).toLocaleString()} · Verify important details before relying on them.</small>
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
