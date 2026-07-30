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
  const conflicts = result.facts.filter((fact) => fact.status === "conflicting");
  const blocking = result.issues.filter((issue) => issue.severity === "blocking");

  return (
    <div className="review-page">
      <header className="review-hero">
        <div>
          <Link className="back-link" href="/"><ArrowIcon className="arrow-back" /> Back to home</Link>
          <StatusBadge tone="current">Guided profile review</StatusBadge>
          <p className="eyebrow">Career evidence import</p>
          <h1>Review what the source says before anything becomes your profile.</h1>
          <p className="review-lede">
            Pro-Flow found {result.facts.length} evidence items across{" "}
            {result.loadedSourceCount} of {result.sourceCount} allowlisted sources.
            Review each item before it can become part of your working career profile.
          </p>
        </div>
        <SurfaceCard className="review-safety-card">
          <ShieldIcon />
          <div>
            <strong>Your source stays protected</strong>
            <p>Decisions save only to Pro-Flow&apos;s private local profile. The source project is never changed.</p>
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
          description="Confirm accurate evidence, correct it with context, or reject it so later workflows use only approved facts."
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
