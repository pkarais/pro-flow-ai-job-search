import type {
  CanonicalCareerProfile,
  CanonicalReviewSummary,
  EvidenceImportResult,
} from "@pro-flow/career-core";
import Link from "next/link";
import { AlertIcon, ArrowIcon, FileIcon, ShieldIcon } from "./icons";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";
import { EvidenceDecisionList } from "./evidence-decision-list";

const sourceStatusCopy = {
  loaded: { label: "Loaded", tone: "complete" as const },
  missing: { label: "Missing", tone: "danger" as const },
  empty: { label: "Empty", tone: "danger" as const },
  unreadable: { label: "Unreadable", tone: "danger" as const },
};

export function EvidenceReview({
  result,
  canonicalProfile,
  reviewSummary,
  compatibilityValid,
}: {
  result: EvidenceImportResult;
  canonicalProfile: CanonicalCareerProfile | null;
  reviewSummary: CanonicalReviewSummary;
  compatibilityValid: boolean;
}) {
  const decisions = new Map(canonicalProfile?.records.map((record) => [record.id, record.decision]) ?? []);
  const conflicts = result.facts.filter((fact) => fact.status === "conflicting" && (decisions.get(fact.id) ?? "pending") === "pending");
  const blocking = result.issues.filter((issue) => issue.severity === "blocking");

  return (
    <div className="review-page">
      <header className="review-hero">
        <div>
          <Link className="back-link" href="/"><ArrowIcon className="arrow-back" /> Back to home</Link>
          <StatusBadge tone="current">Guided profile review</StatusBadge>
          <p className="eyebrow">Canonical career evidence</p>
          <h1>Review the career record owned by Pro Flow.</h1>
          <p className="review-lede">
            Pro Flow contains {result.facts.length} evidence items across{" "}
            {result.loadedSourceCount} evidence groups. This private canonical record
            is the sole source of truth for application decisions and documents.
          </p>
        </div>
        <SurfaceCard className="review-safety-card">
          <ShieldIcon />
          <div>
            <strong>Your evidence stays private</strong>
            <p>Decisions update only Pro Flow&apos;s local, gitignored canonical career record.</p>
          </div>
        </SurfaceCard>
      </header>

      <section className="review-summary-grid" aria-label="Import preview summary">
        <SummaryMetric label="Sources loaded" value={`${result.loadedSourceCount}/${result.sourceCount}`} detail="Explicit allowlist only" />
        <SummaryMetric label="Evidence items" value={String(result.facts.length)} detail={`${reviewSummary.pending} awaiting human review`} />
        <SummaryMetric label="Needs verification" value={String(conflicts.length)} detail="Unresolved source-marked uncertainty" tone="warning" />
        <SummaryMetric label="Blocking issues" value={String(blocking.length)} detail="Resolve before import" tone={blocking.length ? "danger" : "complete"} />
      </section>

      {result.issues.length ? (
        <section className="review-section">
          <SectionHeading
            eyebrow="Attention queue"
            title="Start with what needs judgment"
            description="Only unresolved warnings appear here. Reviewed uncertainty remains preserved in the canonical ledger without staying in your action queue."
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
          title="Every evidence group has a visible status"
          description="These provenance labels are historical context inside Pro Flow, not live external dependencies."
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
          title="Facts remain tied to their provenance"
          description="Confirm accurate evidence, correct any reviewed or pending item, reject unusable material, or add new confirmed evidence."
        />
        <EvidenceDecisionList
          facts={result.facts}
          initialCompatibilityValid={compatibilityValid}
          initialRecords={canonicalProfile?.records ?? []}
          initialSummary={reviewSummary}
        />
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
