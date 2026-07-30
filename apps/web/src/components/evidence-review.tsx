import type { EvidenceImportResult } from "@pro-flow/career-core";
import Link from "next/link";
import { AlertIcon, ArrowIcon, CheckIcon, FileIcon, ShieldIcon } from "./icons";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

const sourceStatusCopy = {
  loaded: { label: "Loaded", tone: "complete" as const },
  missing: { label: "Missing", tone: "danger" as const },
  empty: { label: "Empty", tone: "danger" as const },
  unreadable: { label: "Unreadable", tone: "danger" as const },
};

export function EvidenceReview({ result }: { result: EvidenceImportResult }) {
  const conflicts = result.facts.filter((fact) => fact.status === "conflicting");
  const blocking = result.issues.filter((issue) => issue.severity === "blocking");

  return (
    <div className="review-page">
      <header className="review-hero">
        <div>
          <Link className="back-link" href="/"><ArrowIcon className="arrow-back" /> Back to home</Link>
          <StatusBadge tone="current">Read-only preview</StatusBadge>
          <p className="eyebrow">Career evidence import</p>
          <h1>Review what the source says before anything becomes your profile.</h1>
          <p className="review-lede">
            Pro-Flow found {result.facts.length} evidence items across{" "}
            {result.loadedSourceCount} of {result.sourceCount} allowlisted sources.
            Nothing on this page can modify either project.
          </p>
        </div>
        <SurfaceCard className="review-safety-card">
          <ShieldIcon />
          <div>
            <strong>Writes are disabled</strong>
            <p>No canonical profile, source document, or application file can be changed in Phase 3.</p>
          </div>
        </SurfaceCard>
      </header>

      <section className="review-summary-grid" aria-label="Import preview summary">
        <SummaryMetric label="Sources loaded" value={`${result.loadedSourceCount}/${result.sourceCount}`} detail="Explicit allowlist only" />
        <SummaryMetric label="Evidence items" value={String(result.facts.length)} detail="Awaiting human review" />
        <SummaryMetric label="Needs verification" value={String(conflicts.length)} detail="Source-marked uncertainty" tone="warning" />
        <SummaryMetric label="Blocking issues" value={String(blocking.length)} detail="Resolve before import" tone={blocking.length ? "danger" : "complete"} />
      </section>

      {result.issues.length ? (
        <section className="review-section">
          <SectionHeading
            eyebrow="Attention queue"
            title="Start with what needs judgment"
            description="Warnings preserve uncertainty and usage restrictions from the original evidence."
          />
          <div className="issue-list">
            {result.issues.map((issue) => (
              <article className={`issue-row issue-row--${issue.severity}`} key={issue.id}>
                <AlertIcon />
                <div>
                  <strong>{issue.severity === "blocking" ? "Required" : issue.severity === "warning" ? "Verify" : "Keep in mind"}</strong>
                  <p>{issue.message}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="review-section">
        <SectionHeading
          eyebrow="Source coverage"
          title="Every file has a visible status"
          description="The importer cannot browse outside these approved relative paths."
        />
        <div className="source-grid">
          {result.sources.map((source) => {
            const status = sourceStatusCopy[source.status];
            return (
              <SurfaceCard className="source-card" key={source.id}>
                <div className="source-card-header">
                  <FileIcon />
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
                <h3>{source.label}</h3>
                <p>{source.relativePath}</p>
                <span>{source.factCount} evidence items</span>
              </SurfaceCard>
            );
          })}
        </div>
      </section>

      <section className="review-section">
        <SectionHeading
          eyebrow="Evidence preview"
          title="Facts remain tied to their source"
          description="Items marked for verification cannot be treated as confirmed in the next phase."
        />
        <div className="fact-list">
          {result.facts.map((fact) => (
            <article className="fact-row" key={fact.id}>
              <div className={fact.status === "conflicting" ? "fact-state fact-state--warning" : "fact-state"}>
                {fact.status === "conflicting" ? <AlertIcon /> : <CheckIcon />}
              </div>
              <div className="fact-copy">
                <div className="fact-meta">
                  <span>{fact.sourceSection ?? "Source evidence"}</span>
                  <StatusBadge tone={fact.status === "conflicting" ? "pending" : "neutral"}>
                    {fact.status === "conflicting" ? "Verify first" : "Review"}
                  </StatusBadge>
                </div>
                <p>{fact.value}</p>
                <small>{fact.sourcePath}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "warning" | "danger" | "complete";
}) {
  return (
    <SurfaceCard className={`summary-metric summary-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </SurfaceCard>
  );
}
