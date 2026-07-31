"use client";

import { useState, type FormEvent } from "react";
import type { ArchivedApplication, DocumentReadiness } from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

export function ApplicationWorkspace() {
  const [application, setApplication] = useState<ArchivedApplication | null>(null);
  const [readiness, setReadiness] = useState<DocumentReadiness | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyName: data.get("companyName"),
        positionTitle: data.get("positionTitle"),
        location: data.get("location"),
        url: data.get("url"),
        description: data.get("description"),
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setError(payload.error ?? "Unable to create the application.");
    setApplication(payload.application);
  }

  async function decide(claimId: string, decision: "verified" | "do_not_use") {
    if (!application) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/applications/claim-decision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: application.id,
        claimId,
        expectedRevision: application.revision,
        decision,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setError(payload.error ?? "Unable to save the decision.");
    setApplication(payload.application);
  }

  async function generateDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const response = await fetch("/api/applications/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: application.id,
        identity: {
          fullName: data.get("fullName"),
          email: data.get("email"),
          phone: data.get("phone"),
        },
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setError(payload.error ?? "Unable to generate documents.");
    setReadiness(payload.readiness);
  }

  async function confirmVisualReview() {
    if (!application || !readiness) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/applications/documents/visual-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: application.id,
        applicationRevision: application.revision,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setError(payload.error ?? "Unable to confirm visual review.");
    setReadiness(payload.readiness);
  }

  return (
    <div className="application-page">
      <header className="application-hero">
        <StatusBadge tone="current">Phase 5 · Application studio</StatusBadge>
        <p className="eyebrow">One guided workflow</p>
        <h1>Turn a posting into a grounded application draft.</h1>
        <p>Paste the job description as untrusted text. Pro-Flow compares it only with evidence you have confirmed, exposes gaps, and archives every review decision locally.</p>
      </header>

      {!application ? (
        <SurfaceCard className="intake-card">
          <SectionHeading eyebrow="Step 1" title="Add the opportunity" description="Required fields are marked. Nothing is submitted to the employer." />
          <form className="application-form" onSubmit={create}>
            <label>Company <input name="companyName" required maxLength={200} /></label>
            <label>Role title <input name="positionTitle" required maxLength={200} /></label>
            <label>Location <input name="location" maxLength={300} /></label>
            <label>Posting URL <input name="url" type="url" maxLength={2000} /></label>
            <label className="form-field--wide">Job description <textarea name="description" required minLength={120} maxLength={50000} rows={14} /></label>
            <button className="button button--primary" disabled={busy}>{busy ? "Building assessment…" : "Evaluate fit and create draft"}</button>
          </form>
        </SurfaceCard>
      ) : (
        <div className="application-results">
          <SurfaceCard className="fit-card">
            <div>
              <p className="eyebrow">Step 2 · Explainable fit</p>
              <h2>{application.opportunity.positionTitle}</h2>
              <p>{application.opportunity.companyName}</p>
            </div>
            <strong className="fit-score">{application.fit.overallScore}<span>/100</span></strong>
            <StatusBadge tone={application.fit.recommendation === "apply" ? "complete" : "pending"}>{application.fit.recommendation.replaceAll("_", " ")}</StatusBadge>
          </SurfaceCard>

          <section className="application-section">
            <SectionHeading eyebrow="Step 3" title="Inspect the structured draft" description="The local draft is intentionally plain and traceable. Phase 6 will render verified documents." />
            <div className="draft-grid">
              <SurfaceCard className="draft-card"><h3>Positioning summary</h3><p>{application.draft.summary}</p></SurfaceCard>
              <SurfaceCard className="draft-card"><h3>Cover-letter draft</h3><pre>{application.draft.coverLetter}</pre></SurfaceCard>
            </div>
            <div className="keyword-grid">
              <div><strong>Supported matches</strong><p>{application.draft.matchedKeywords.join(", ") || "No direct keyword matches yet."}</p></div>
              <div><strong>Visible gaps</strong><p>{application.draft.gaps.join(", ") || "No keyword gaps detected."}</p></div>
            </div>
          </section>

          <section className="application-section">
            <SectionHeading eyebrow="Step 4" title="Review every material claim" description="A claim can remain in later documents only after you verify it. Rejected claims stay in the private audit record." />
            <div className="claim-list">
              {application.draft.claims.map((claim) => (
                <SurfaceCard className="claim-card" key={claim.id}>
                  <div><StatusBadge tone={claim.decision === "verified" ? "complete" : claim.decision === "do_not_use" ? "danger" : "pending"}>{claim.decision.replaceAll("_", " ")}</StatusBadge><p>{claim.text}</p><small>Evidence: {claim.evidenceIds.join(", ")}</small></div>
                  <div className="claim-actions">
                    <button className="button button--primary" disabled={busy || claim.decision !== "pending"} onClick={() => decide(claim.id, "verified")}>Verify</button>
                    <button className="button button--secondary" disabled={busy || claim.decision !== "pending"} onClick={() => decide(claim.id, "do_not_use")}>Do not use</button>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>

          <SurfaceCard className="archive-card">
            <p className="eyebrow">Step 5 · Local archive</p>
            <h2>{application.status === "review_complete" ? "Factual review complete" : "Review is still required"}</h2>
            <p>Application <code>{application.id}</code> is saved privately at revision {application.revision}. “Ready to Submit” remains locked until every document check passes.</p>
            {application.status === "review_complete" ? (
              <form className="document-details-form" onSubmit={generateDocuments}>
                <p>Enter the exact contact text that should appear in both private documents.</p>
                <label>Full name <input name="fullName" required maxLength={200} /></label>
                <label>Email <input name="email" required type="email" maxLength={320} /></label>
                <label>Phone <input name="phone" required maxLength={80} /></label>
                <button className="button button--primary" disabled={busy}>
                  {busy ? "Running document checks…" : "Generate and verify documents"}
                </button>
              </form>
            ) : null}
          </SurfaceCard>

          {readiness ? (
            <section className="application-section readiness-workspace">
              <SectionHeading
                eyebrow="Phase 6 · Readiness gate"
                title={readiness.status === "ready" ? "Ready to submit" : "Documents are blocked"}
                description="Every mandatory check must pass. Pending or failed checks cannot be overridden here."
              />
              <div className="readiness-checks">
                {readiness.checks.map((item) => (
                  <SurfaceCard className="readiness-check-card" key={item.id}>
                    <StatusBadge tone={item.status === "passed" ? "complete" : item.status === "failed" ? "danger" : "pending"}>{item.status}</StatusBadge>
                    <div><strong>{item.label}</strong><p>{item.detail}</p></div>
                  </SurfaceCard>
                ))}
              </div>
              <div className="artifact-actions" aria-label="Private document artifacts">
                {readiness.artifacts.map((artifact) => (
                  <a
                    className="button button--secondary"
                    href={`/api/applications/artifacts/${application.id}/${artifact.kind}`}
                    key={artifact.kind}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open {artifact.kind.replaceAll("_", " ")}
                  </a>
                ))}
              </div>
              {readiness.checks.find((item) => item.id === "visual_review")?.status === "pending"
                && readiness.checks.every((item) => item.id === "visual_review" || item.status === "passed") ? (
                  <button className="button button--primary" disabled={busy} onClick={confirmVisualReview}>
                    I inspected both PDFs and they look correct
                  </button>
                ) : null}
              <SurfaceCard className={`readiness-verdict readiness-verdict--${readiness.status}`}>
                <strong>{readiness.status === "ready" ? "All required checks passed." : "Ready to Submit remains locked."}</strong>
                <p>{readiness.artifacts.length} private artifact record(s) were written. No document was submitted or exposed publicly.</p>
              </SurfaceCard>
            </section>
          ) : null}
        </div>
      )}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
