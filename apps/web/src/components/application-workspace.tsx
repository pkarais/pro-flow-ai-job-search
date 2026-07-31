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
  type CompanyInsightRecord,
} from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

type InitialOpportunity = {
  companyName: string;
  positionTitle: string;
  location: string;
  url: string;
  description: string;
};

type RefinementSuggestion = {
  title: string;
  rationale: string;
  prompt: string;
  evidenceIds: string[];
  insightIds: string[];
};

export function ApplicationWorkspace({
  initialOpportunity,
  initialApplication,
  initialReadiness,
  availableInsights = [],
  initialIdentity,
  initialThemeId,
  initialPaletteId,
}: {
  initialOpportunity?: InitialOpportunity;
  initialApplication?: ArchivedApplication;
  initialReadiness?: DocumentReadiness | null;
  availableInsights?: CompanyInsightRecord[];
  initialIdentity?: { fullName: string; email: string; phone: string };
  initialThemeId?: DocumentThemeId;
  initialPaletteId?: DocumentPalette;
}) {
  const [application, setApplication] = useState<ArchivedApplication | null>(initialApplication ?? null);
  const [readiness, setReadiness] = useState<DocumentReadiness | null>(initialReadiness ?? null);
  const [themeId, setThemeId] = useState<DocumentThemeId>(initialReadiness?.themeId ?? initialThemeId ?? "ats_classic");
  const [paletteOverride, setPaletteOverride] = useState<"ai" | DocumentPalette>(initialReadiness?.paletteId ?? initialPaletteId ?? "ai");
  const [identity, setIdentity] = useState(initialIdentity ?? { fullName: "", email: "", phone: "" });
  const [previewHtml, setPreviewHtml] = useState("");
  const [coverPreviewHtml, setCoverPreviewHtml] = useState("");
  const [previewDirection, setPreviewDirection] = useState("");
  const [previewContentSource, setPreviewContentSource] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [directRecipients, setDirectRecipients] = useState<string[]>([]);
  const [emailPackageStatus, setEmailPackageStatus] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [refinementInstructions, setRefinementInstructions] = useState("");
  const [selectedInsightIds, setSelectedInsightIds] = useState<string[]>(availableInsights.slice(0, 1).map((insight) => insight.id));
  const [refinementSuggestions, setRefinementSuggestions] = useState<RefinementSuggestion[]>([]);
  const [selectedSuggestionIndexes, setSelectedSuggestionIndexes] = useState<number[]>([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState("");

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
      } catch (caught) {
        if (!controller.signal.aborted) {
          setPreviewHtml("");
          setCoverPreviewHtml("");
          setPreviewError(caught instanceof Error ? caught.message : "Unable to update the document preview.");
        }
      } finally {
        if (!controller.signal.aborted) setPreviewBusy(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort(new DOMException("Preview request superseded.", "AbortError"));
    };
  }, [application, identity, paletteOverride, themeId]);

  useEffect(() => {
    if (!application || readiness?.status !== "ready") {
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/applications/email-package?applicationId=${encodeURIComponent(application.id)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => { setDirectRecipients(Array.isArray(payload.recipients) ? payload.recipients : []); setGmailConnected(payload.gmail?.connected === true); setGmailEmail(payload.gmail?.email ?? ""); })
      .catch(() => {
        if (!controller.signal.aborted) setDirectRecipients([]);
      });
    return () => controller.abort();
  }, [application, readiness?.status]);

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
        refinementInstructions: refinementInstructions.trim() || undefined,
        insightIds: selectedInsightIds,
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
    setRefinementInstructions("");
    setSelectedInsightIds([]);
  }

  async function generateEmphasisSuggestions() {
    if (!application) return;
    setSuggestionsBusy(true); setSuggestionsError(""); setRefinementSuggestions([]); setSelectedSuggestionIndexes([]);
    try {
      const response = await fetch("/api/applications/refinement-suggestions", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationId: application.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to generate emphasis suggestions.");
      setRefinementSuggestions(payload.suggestions ?? []);
    } catch (caught) {
      setSuggestionsError(caught instanceof Error ? caught.message : "Unable to generate emphasis suggestions.");
    } finally { setSuggestionsBusy(false); }
  }

  function applyEmphasisSuggestion(suggestion: RefinementSuggestion) {
    setRefinementInstructions(suggestion.prompt);
    setSelectedInsightIds(availableInsights.slice(0, 1).map((insight) => insight.id));
  }

  function applySelectedSuggestionBlend() {
    const selected = refinementSuggestions.filter((_, index) => selectedSuggestionIndexes.includes(index));
    if (!selected.length) return;
    setRefinementInstructions([
      "Create one cohesive, concise final application package by blending all of the following selected emphasis directions. Do not treat them as separate mini-sections, repeat the same evidence, or overcrowd the documents. Prioritize the strongest role-specific material and make the positioning summary, résumé bullets, and cover letter reinforce one another:",
      ...selected.map((suggestion, index) => `${index + 1}. ${suggestion.prompt}`),
    ].join("\n\n"));
    setSelectedInsightIds(availableInsights.slice(0, 1).map((insight) => insight.id));
  }

  async function manageDraftVersion(draftRevision: number, action: "restore" | "delete") {
    if (!application) return;
    if (action === "delete" && !window.confirm(`Delete saved draft version ${draftRevision}? This cannot be undone.`)) return;
    setBusy(true); setError("");
    const response = await fetch("/api/applications/draft-version", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationId: application.id, expectedRevision: application.revision, draftRevision, action }) });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setError(payload.error ?? "Unable to update the saved version.");
    setApplication(payload.application); setReadiness(null); setPreviewHtml(""); setCoverPreviewHtml("");
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
    window.setTimeout(() => document.getElementById("document-readiness")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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

  async function prepareEmailPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setEmailPackageStatus("");
    try {
      const response = await fetch("/api/applications/email-package", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          recipient: data.get("recipient"),
          documentStyle: data.get("documentStyle"),
          senderName: identity.fullName,
        }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to prepare the email draft.");
      }
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "application-email-draft.eml";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setEmailPackageStatus("Email draft downloaded with the selected résumé and cover letter attached. Open the .eml file, review it, and select Send in your email application.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to prepare the email draft.");
    } finally {
      setBusy(false);
    }
  }

  async function createApplicationGmailDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;
    const data = new FormData(event.currentTarget);
    const gmailWindow = window.open("about:blank", "_blank");
    setBusy(true); setError(""); setEmailPackageStatus("");
    try {
      const response = await fetch("/api/integrations/gmail/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "application", applicationId: application.id, recipient: data.get("recipient"), documentStyle: data.get("documentStyle"), senderName: identity.fullName }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create the Gmail draft.");
      setEmailPackageStatus("The complete application was created in Gmail Drafts with both PDFs attached. Opening it now.");
      if (gmailWindow) gmailWindow.location.href = payload.gmailUrl;
      else setEmailPackageStatus("The complete application was created in Gmail Drafts. The browser blocked the new tab, so open Gmail Drafts to review it.");
    } catch (caught) { gmailWindow?.close(); setError(caught instanceof Error ? caught.message : "Unable to create the Gmail draft."); }
    finally { setBusy(false); }
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
            <SectionHeading
              eyebrow="Step 4"
              title={application.status === "review_complete" ? "Factual review complete" : "Review every material claim"}
              description={application.status === "review_complete"
                ? "Your factual approval is complete. Later AI polishing retains it and proceeds directly to file regeneration."
                : "A claim can remain in later documents only after you verify it. Rejected claims stay in the private audit record."}
            />
            {application.status === "review_complete" ? <SurfaceCard className="review-complete-summary">
              <StatusBadge tone="complete">Approved once</StatusBadge>
              <p>{application.draft.claims.length} current claims are approved. You do not need to review this cascade again.</p>
              <details>
                <summary>View approved claim record</summary>
                <div className="claim-list">
                  {application.draft.claims.map((claim) => <div className="reviewed-claim" key={claim.id}><p>{claim.text}</p><small>{claim.kind?.replaceAll("_", " ") ?? "resume bullet"}</small></div>)}
                </div>
              </details>
            </SurfaceCard> : <div className="claim-list">
              {application.draft.claims.map((claim) => (
                <SurfaceCard className="claim-card" key={claim.id}>
                  <div><StatusBadge tone={claim.decision === "verified" ? "complete" : claim.decision === "do_not_use" ? "danger" : "pending"}>{claim.decision.replaceAll("_", " ")}</StatusBadge><p>{claim.text}</p><small>{claim.kind ? `${claim.kind.replaceAll("_", " ")} · ` : ""}Evidence: {claim.evidenceIds.join(", ")}</small></div>
                  <div className="claim-actions">
                    <button className="button button--primary" disabled={busy || claim.decision !== "pending"} onClick={() => decide(claim.id, "verified")}>Verify</button>
                    <button className="button button--secondary" disabled={busy || claim.decision !== "pending"} onClick={() => decide(claim.id, "do_not_use")}>Do not use</button>
                  </div>
                </SurfaceCard>
              ))}
            </div>}
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
                    <p>After you review the replacement claims, the document action regenerates every current-format file—ATS and designed PDFs, HTML, DOCX, source files, and readiness records—for the selected version.</p>
                  </div>
                  <div className="refinement-suggestion-tools">
                    <button className="button button--secondary" type="button" disabled={busy || suggestionsBusy} onClick={() => void generateEmphasisSuggestions()}>
                      {suggestionsBusy ? "Analyzing role and evidence…" : "Generate AI emphasis suggestions"}
                    </button>
                    <small>Reanalyzes the existing positioning summary, résumé bullets, and cover letter against the complete posting, your confirmed information, and the latest saved company-insights report.</small>
                    {suggestionsError ? <p className="error-message" role="alert">{suggestionsError}</p> : null}
                    {refinementSuggestions.length ? <>
                      <div className="refinement-selection-actions">
                        <button className="button button--secondary" type="button" onClick={() => setSelectedSuggestionIndexes(refinementSuggestions.map((_, index) => index))}>Select all</button>
                        <button className="button button--secondary" type="button" onClick={() => setSelectedSuggestionIndexes([])}>Clear</button>
                        <button className="button button--primary" type="button" disabled={!selectedSuggestionIndexes.length} onClick={applySelectedSuggestionBlend}>Use selected blend ({selectedSuggestionIndexes.length})</button>
                      </div>
                      <div className="refinement-suggestion-list">
                      {refinementSuggestions.map((suggestion, index) => <article className={`refinement-suggestion${selectedSuggestionIndexes.includes(index) ? " refinement-suggestion--selected" : ""}`} key={`${suggestion.title}-${index}`}>
                        <label className="refinement-suggestion-heading">
                          <input type="checkbox" checked={selectedSuggestionIndexes.includes(index)} onChange={(event) => setSelectedSuggestionIndexes((current) => event.target.checked ? [...new Set([...current, index])] : current.filter((item) => item !== index))} />
                          <strong>{suggestion.title}</strong>
                        </label>
                        <p>{suggestion.rationale}</p>
                        <blockquote>{suggestion.prompt}</blockquote>
                        <button className="button button--secondary" type="button" onClick={() => applyEmphasisSuggestion(suggestion)}>Use only this emphasis</button>
                      </article>)}
                    </div></> : null}
                  </div>
                  <label className="form-field--wide">Tell AI what to emphasize in the next version
                    <textarea value={refinementInstructions} onChange={(event) => setRefinementInstructions(event.target.value)} rows={10} maxLength={8000} placeholder="Generate AI suggestions above, select the directions you want, then use the selected blend—or write your own direction here." />
                    <small>The final-polish pass rewrites every document section as one coordinated package. It cannot add unsupported experience, credentials, or results.</small>
                  </label>
                  {availableInsights.length ? <fieldset className="form-field--wide">
                    <legend>Latest AI insights included automatically</legend>
                    <p>The newest company-insights report for this job is automatically combined with the complete posting and your confirmed experience. Older reports are not used.</p>
                    {availableInsights.map((insight) => <div className="insight-selection" key={insight.id}>
                      <strong>Company overview and salary analysis · {new Date(insight.generatedAt).toLocaleString()}</strong>
                      <details><summary>Preview the saved report</summary><p>{insight.report.slice(0, 1_200)}{insight.report.length > 1_200 ? "…" : ""}</p></details>
                    </div>)}
                  </fieldset> : <p className="adapter-note">No saved AI insights are available for this application yet. Generate them from its application card, then reopen the studio.</p>}
                  <button className="button button--primary" disabled={busy} onClick={regenerateDraft}>
                    {busy ? "Regenerating draft…" : "Regenerate draft"}
                  </button>
            </SurfaceCard>
            {application.draftHistory?.length ? <details className="draft-version-history">
              <summary>Manage {application.draftHistory.length} previous draft version(s) <span>Optional · no action required</span></summary>
              <p>Draft version {(application.draftHistory?.length ?? 0) + 1} is already active. Open this history only if you deliberately want to restore or delete an earlier draft.</p>
              <div className="draft-version-list">
                {application.draftHistory.slice().reverse().map((version, index) => <SurfaceCard className="pipeline-card" key={version.revision}>
                  <div><StatusBadge tone="neutral">Previous draft version {(application.draftHistory?.length ?? 0) - index}</StatusBadge><p>{version.draft.summary}</p><small>Saved {new Date(version.archivedAt).toLocaleString()}</small></div>
                  <div className="claim-actions"><button className="button button--secondary" disabled={busy} onClick={() => void manageDraftVersion(version.revision, "restore")}>Restore this older draft</button><button className="button button--secondary" disabled={busy} onClick={() => void manageDraftVersion(version.revision, "delete")}>Delete older draft</button></div>
                </SurfaceCard>)}
              </div>
            </details> : null}
          </section>

          <SurfaceCard className="archive-card">
            <p className="eyebrow">Step 5 · Local archive</p>
            <h2>{application.status === "review_complete" ? "Factual review complete" : "Review is still required"}</h2>
            <p>Application <code>{application.id}</code> is saved privately at revision {application.revision}. “Ready to Submit” remains locked until every document check passes.</p>
            {application.status !== "review_complete" ? <p className="adapter-note" role="status">
              Document preview and file regeneration will return after you review the {application.draft.claims.filter((claim) => claim.decision === "pending").length} remaining claim(s) above. Previous draft content remains preserved in draft history.
            </p> : null}
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
                  {busy ? "Running document checks…" : initialApplication ? "Regenerate all files for this version" : "Generate ATS PDF, designed PDF & DOCX"}
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
            <section className="application-section readiness-workspace" id="document-readiness">
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
                    href={`/api/applications/artifacts/${application.id}/${artifact.kind}?revision=${readiness.applicationRevision}&generated=${encodeURIComponent(readiness.generatedAt)}`}
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
              <SurfaceCard className="readiness-verdict">
                  <SectionHeading
                    eyebrow="Direct application email"
                    title={gmailConnected ? "Create a Gmail draft with attachments" : "Prepare a local email with attachments"}
                    description="Recipients come from saved direct-application research. Pro Flow creates a reviewable draft and never sends it automatically."
                  />
                  {readiness.status !== "ready" ? <div className="adapter-note">
                    <strong>Email drafting is connected but waiting for document readiness.</strong>
                    <p>{readiness.checks.filter((item) => item.status !== "passed").map((item) => `${item.label}: ${item.detail}`).join(" ")}</p>
                    <button className="button button--primary" type="button" disabled>Create Gmail draft with attachments</button>
                  </div> : (
                    <form className="operations-stack-form" onSubmit={gmailConnected ? createApplicationGmailDraft : prepareEmailPackage}>
                      <label>Recipient email
                        <input name="recipient" type="email" required list="researched-recipient-options" defaultValue={directRecipients[0] ?? ""} placeholder={gmailEmail || "recipient@example.com"} />
                        <datalist id="researched-recipient-options">{directRecipients.map((email) => <option key={email} value={email} />)}</datalist>
                        <small>Type or paste any address you have verified. Saved research addresses appear as suggestions; use your connected Gmail address for a safe draft test.</small>
                      </label>
                      <label>Document package
                        <select name="documentStyle" defaultValue="designed">
                          <option value="designed">Designed résumé + coordinated cover letter</option>
                          <option value="ats">ATS résumé + cover letter</option>
                        </select>
                      </label>
                      <button className="button button--primary" disabled={busy} type="submit">{gmailConnected ? "Create Gmail draft with attachments" : "Download attached email draft (.eml)"}</button>
                      {!gmailConnected ? <p>For the one-click workflow, <a className="text-link" href="/gmail">connect Gmail</a>. The local .eml remains available until then.</p> : null}
                    </form>
                  )}
                  {emailPackageStatus ? <p className="save-status save-status--success" role="status">{emailPackageStatus}</p> : null}
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
