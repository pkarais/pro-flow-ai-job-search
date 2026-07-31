"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  documentThemes,
  documentPalettes,
  recommendDocumentTheme,
  type ArchivedApplication,
  type DocumentReadiness,
  type DocumentThemeId,
  type DocumentPalette,
} from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

type InitialOpportunity = {
  companyName: string;
  positionTitle: string;
  location: string;
  url: string;
  description: string;
};

export function ApplicationWorkspace({
  initialOpportunity,
}: {
  initialOpportunity?: InitialOpportunity;
}) {
  const [application, setApplication] = useState<ArchivedApplication | null>(null);
  const [readiness, setReadiness] = useState<DocumentReadiness | null>(null);
  const [themeId, setThemeId] = useState<DocumentThemeId>("ats_classic");
  const [paletteOverride, setPaletteOverride] = useState<"ai" | DocumentPalette>("ai");
  const [identity, setIdentity] = useState({ fullName: "", email: "", phone: "" });
  const [previewHtml, setPreviewHtml] = useState("");
  const [coverPreviewHtml, setCoverPreviewHtml] = useState("");
  const [previewDirection, setPreviewDirection] = useState("");
  const [previewContentSource, setPreviewContentSource] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!application || application.status !== "review_complete"
      || !identity.fullName.trim() || !identity.email.includes("@") || !identity.phone.trim()) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreviewBusy(true);
      setPreviewError("");
      try {
        const response = await fetch("/api/applications/resume-preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            applicationId: application.id,
            identity,
            themeId,
            ...(paletteOverride !== "ai" ? { paletteOverride } : {}),
          }),
          signal: controller.signal,
        });
        const payload = await response.json();
        if (response.ok) {
          setPreviewHtml(payload.html);
          setCoverPreviewHtml(payload.coverHtml ?? "");
          setPreviewDirection(payload.resume?.artDirection?.rationale ?? "");
          setPreviewContentSource(payload.contentSource ?? "");
        } else {
          setPreviewHtml("");
          setPreviewError(payload.error ?? "Unable to update the document preview.");
        }
      } finally {
        if (!controller.signal.aborted) setPreviewBusy(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [application, identity, paletteOverride, themeId]);

  const previewReady = Boolean(
    identity.fullName.trim() && identity.email.includes("@") && identity.phone.trim(),
  );

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
    setThemeId(recommendDocumentTheme(payload.application.opportunity.positionTitle));
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
    setReadiness(null);
  }

  async function regenerateDraft() {
    if (!application) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/applications/regenerate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId: application.id,
        expectedRevision: application.revision,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setError(payload.error ?? "Unable to regenerate the draft.");
    setApplication(payload.application);
    setReadiness(null);
    setPreviewHtml("");
    setCoverPreviewHtml("");
    setPreviewDirection("");
    setPreviewContentSource("");
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
        themeId: data.get("themeId"),
        ...(paletteOverride !== "ai" ? { paletteOverride } : {}),
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
    <div className="application-page" id="workspace">
      <header className="application-hero">
        <StatusBadge tone="current">Phase 5 · Application studio</StatusBadge>
        <p className="eyebrow">One guided workflow</p>
        <h1>Turn a posting into a grounded application draft.</h1>
        <p>Paste the job description as untrusted text. Pro-Flow compares it only with evidence you have confirmed, exposes gaps, and archives every review decision locally.</p>
      </header>

      {!application ? (
        <SurfaceCard className="intake-card">
          <SectionHeading
            eyebrow="Step 1"
            title={initialOpportunity ? "Review the selected posting" : "Add the opportunity"}
            description={initialOpportunity
              ? "The saved job is loaded below. Confirm the details, then evaluate fit to begin the resume and cover-letter workflow."
              : "Required fields are marked. Nothing is submitted to the employer."}
          />
          {initialOpportunity ? (
            <p className="search-launch-message" role="status">
              Selected posting loaded. You can correct any field before continuing.
            </p>
          ) : null}
          <form className="application-form" onSubmit={create}>
            <label>Company <input name="companyName" required maxLength={200} defaultValue={initialOpportunity?.companyName} /></label>
            <label>Role title <input name="positionTitle" required maxLength={200} defaultValue={initialOpportunity?.positionTitle} /></label>
            <label>Location <input name="location" maxLength={300} defaultValue={initialOpportunity?.location} /></label>
            <label>Posting URL <input name="url" type="url" maxLength={2000} defaultValue={initialOpportunity?.url} /></label>
            <label className="form-field--wide">Job description <textarea name="description" required minLength={120} maxLength={50000} rows={14} defaultValue={initialOpportunity?.description} /></label>
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
              <StatusBadge tone={application.draft.generation?.method === "ai" ? "current" : "neutral"}>
                {application.draft.generation?.method === "ai" ? "AI-written · evidence grounded" : "Local fallback draft"}
              </StatusBadge>
              {application.draft.generation?.note ? <small>{application.draft.generation.note}</small> : null}
            </div>
            <strong className="fit-score">{application.fit.overallScore}<span>/100</span></strong>
            <StatusBadge tone={application.fit.recommendation === "apply" ? "complete" : "pending"}>{application.fit.recommendation.replaceAll("_", " ")}</StatusBadge>
          </SurfaceCard>

          <section className="application-section">
            <SectionHeading eyebrow="Step 3" title="Inspect the structured draft" description="The local draft is intentionally plain and traceable. Phase 6 will render verified documents." />
            <div className="draft-grid">
              <SurfaceCard className="draft-card"><h3>Positioning summary</h3><p>{application.draft.summary}</p></SurfaceCard>
              <SurfaceCard className="draft-card">
                <h3>Tailored résumé bullets</h3>
                <ul>
                  {application.draft.claims
                    .filter((claim) => !claim.kind || claim.kind === "resume_bullet")
                    .map((claim) => <li key={claim.id}>{claim.text}</li>)}
                </ul>
              </SurfaceCard>
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
                  <div><StatusBadge tone={claim.decision === "verified" ? "complete" : claim.decision === "do_not_use" ? "danger" : "pending"}>{claim.decision.replaceAll("_", " ")}</StatusBadge><p>{claim.text}</p><small>{claim.kind ? `${claim.kind.replaceAll("_", " ")} · ` : ""}Evidence: {claim.evidenceIds.join(", ")}</small></div>
                  <div className="claim-actions">
                    <button className="button button--primary" disabled={busy || claim.decision !== "pending"} onClick={() => decide(claim.id, "verified")}>Verify</button>
                    <button className="button button--secondary" disabled={busy || claim.decision !== "pending"} onClick={() => decide(claim.id, "do_not_use")}>Do not use</button>
                  </div>
                </SurfaceCard>
              ))}
            </div>
            <SurfaceCard className="regenerate-draft-card">
                  <div>
                    <strong>
                      {application.draft.claims.some((claim) => claim.decision === "do_not_use")
                        ? "Rejected language will not be rendered."
                        : "Want a stronger or differently focused draft?"}
                    </strong>
                    <p>
                      {application.draft.claims.some((claim) => claim.decision === "do_not_use")
                        ? "Regenerate without the claims you marked “Do not use,” then review the replacement claims."
                        : "Regenerate from the posting and confirmed career evidence. The current draft remains in private history."}
                    </p>
                  </div>
                  <button className="button button--primary" disabled={busy} onClick={regenerateDraft}>
                    {busy ? "Regenerating draft…" : "Regenerate draft"}
                  </button>
            </SurfaceCard>
          </section>

          <SurfaceCard className="archive-card">
            <p className="eyebrow">Step 5 · Local archive</p>
            <h2>{application.status === "review_complete" ? "Factual review complete" : "Review is still required"}</h2>
            <p>Application <code>{application.id}</code> is saved privately at revision {application.revision}. “Ready to Submit” remains locked until every document check passes.</p>
            {application.status === "review_complete" ? (
              <form className="document-details-form" onSubmit={generateDocuments}>
                <p>Enter the exact contact text that should appear in both private documents.</p>
                <label>Full name <input name="fullName" required maxLength={200} value={identity.fullName} onChange={(event) => setIdentity((current) => ({ ...current, fullName: event.target.value }))} /></label>
                <label>Email <input name="email" required type="email" maxLength={320} value={identity.email} onChange={(event) => setIdentity((current) => ({ ...current, email: event.target.value }))} /></label>
                <label>Phone <input name="phone" required maxLength={80} value={identity.phone} onChange={(event) => setIdentity((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label className="theme-chooser">
                  Document theme
                  <select
                    name="themeId"
                    value={themeId}
                    onChange={(event) => setThemeId(event.target.value as DocumentThemeId)}
                  >
                    {documentThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>{theme.name} — {theme.bestFor}</option>
                    ))}
                  </select>
                  <small>
                    Recommended for this role: {documentThemes.find((theme) => theme.id === recommendDocumentTheme(application.opportunity.positionTitle))?.name}.
                    {" "}{documentThemes.find((theme) => theme.id === themeId)?.description}
                  </small>
                </label>
                <label className="theme-chooser">
                  Color palette
                  <select
                    value={paletteOverride}
                    onChange={(event) => setPaletteOverride(event.target.value as "ai" | DocumentPalette)}
                  >
                    <option value="ai">AI-selected color</option>
                    {documentPalettes.map((palette) => (
                      <option key={palette.id} value={palette.id}>{palette.name}</option>
                    ))}
                  </select>
                  <small>Changes color only. Template, layout, content, icons, density, and spacing remain unchanged.</small>
                </label>
                <button className="button button--primary" disabled={busy}>
                  {busy ? "Running document checks…" : "Generate ATS PDF, designed PDF & DOCX"}
                </button>
              </form>
            ) : null}
          </SurfaceCard>

          {application.status === "review_complete" ? (
            <section className="application-section document-studio">
              <SectionHeading
                eyebrow="Live document studio"
                title="Preview the designed résumé before exporting"
                description="The preview and designed exports share one structured, evidence-grounded résumé. The ATS PDF remains a separate single-column submission artifact."
              />
              <SurfaceCard className="regenerate-draft-card">
                <div>
                  <strong>Author a completely fresh application package</strong>
                  <p>
                    AI will rewrite the resume summary, achievements, cover-letter opening, body, closing, and art direction for this posting.
                    The replacement becomes a new private revision and must be factually reviewed before preview or export.
                  </p>
                  <small>
                    Current revision {application.revision}
                    {application.draft.generation?.model ? ` · ${application.draft.generation.model}` : ""}
                    {` · ${new Date(application.updatedAt).toLocaleString()}`}
                  </small>
                </div>
                <button className="button button--primary" disabled={busy} onClick={regenerateDraft}>
                  {busy ? "AI is authoring…" : "Generate fresh AI resume & cover letter"}
                </button>
              </SurfaceCard>
              <div className="resume-preview-shell">
                {previewBusy ? <p className="resume-preview-state">Updating preview…</p> : null}
                {previewError ? <p className="error-banner">{previewError}</p> : null}
                {previewReady && previewHtml ? (
                  <div className="document-preview-pages">
                    <iframe className="resume-preview-frame" sandbox="" srcDoc={previewHtml} title={`${documentThemes.find((theme) => theme.id === themeId)?.name ?? "Selected"} résumé preview`} />
                    {coverPreviewHtml ? <iframe className="resume-preview-frame" sandbox="" srcDoc={coverPreviewHtml} title="Coordinated cover letter preview" /> : null}
                  </div>
                ) : (
                  <div className="resume-preview-empty">Enter your name, email, and phone above to activate the live preview.</div>
                )}
              </div>
              <p className="resume-preview-caption">Showing: {documentThemes.find((theme) => theme.id === themeId)?.name ?? themeId}</p>
              {previewContentSource ? <p className="resume-art-direction"><strong>Content source:</strong> {previewContentSource === "ai" ? "AI draft constrained by verified evidence" : "deterministic evidence-based fallback"}</p> : null}
              {previewDirection ? <p className="resume-art-direction"><strong>Art direction:</strong> {previewDirection}</p> : null}
            </section>
          ) : null}

          {readiness ? (
            <section className="application-section readiness-workspace">
              <SectionHeading
                eyebrow="Phase 6 · Readiness gate"
                title={readiness.status === "ready" ? "Ready to submit" : "Documents are blocked"}
                description={`${documentThemes.find((theme) => theme.id === readiness.themeId)?.name ?? readiness.themeId} theme · Every mandatory check must pass. Pending or failed checks cannot be overridden here.`}
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
                    {artifactLabel(artifact.kind)}
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

function artifactLabel(kind: string) {
  const labels: Record<string, string> = {
    cv_pdf: "Open ATS resume PDF",
    cv_source: "Open ATS resume source",
    cover_letter_pdf: "Open cover letter PDF",
    cover_letter_source: "Open cover letter source",
    designed_resume_html: "Open designed resume HTML",
    designed_resume_pdf: "Open designed resume PDF",
    resume_docx: "Download editable resume DOCX",
    designed_cover_letter_html: "Open designed cover letter HTML",
    designed_cover_letter_pdf: "Open designed cover letter PDF",
    cover_letter_docx: "Download editable cover letter DOCX",
  };
  return labels[kind] ?? `Open ${kind.replaceAll("_", " ")}`;
}
