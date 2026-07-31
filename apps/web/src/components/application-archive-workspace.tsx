"use client";

import type { ArchivedApplication, DocumentReadiness } from "@pro-flow/career-core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge, SurfaceCard } from "./ui";
import type { HybridVaultSummary } from "@/server/vault/hybrid-vault";

export function ApplicationArchiveWorkspace({
  initialApplications,
  dismissedApplicationIds,
  initialReadiness,
  vaultSummary,
  supplementalByApplication,
}: {
  initialApplications: ArchivedApplication[];
  dismissedApplicationIds: string[];
  initialReadiness: Array<DocumentReadiness | null>;
  vaultSummary: HybridVaultSummary;
  supplementalByApplication: Record<string, { insights: number; interviews: number }>;
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [dismissed, setDismissed] = useState(new Set(dismissedApplicationIds));
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const router = useRouter();
  const groups = groupApplications(applications);

  useEffect(() => {
    const refreshArchive = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", refreshArchive);
    document.addEventListener("visibilitychange", refreshArchive);
    return () => {
      window.removeEventListener("focus", refreshArchive);
      document.removeEventListener("visibilitychange", refreshArchive);
    };
  }, [router]);

  async function restore(id: string) {
    setBusyId(id);
    setMessage("");
    const response = await fetch("/api/applications/archive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicationId: id }),
    });
    const result = await response.json() as { message?: string; error?: string };
    if (response.ok) {
      setDismissed((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
    setMessage(result.message ?? result.error ?? "The archive could not be restored.");
    setBusyId("");
  }

  async function permanentlyDelete(application: ArchivedApplication) {
    const label = `${application.opportunity.positionTitle} at ${application.opportunity.companyName}`;
    if (!window.confirm(`Permanently delete “${label}” and its private generated artifacts? This cannot be undone.`)) return;
    setBusyId(application.id);
    setMessage("");
    const response = await fetch("/api/applications/archive", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicationId: application.id }),
    });
    const result = await response.json() as { message?: string; error?: string };
    if (response.ok) {
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setDismissed((current) => {
        const next = new Set(current);
        next.delete(application.id);
        return next;
      });
    }
    setMessage(result.message ?? result.error ?? "The archive could not be deleted.");
    setBusyId("");
  }

  function readinessFor(applicationId: string) {
    return initialReadiness.find((item) => item?.applicationId === applicationId);
  }

  function downloadActions(application: ArchivedApplication, compact = false) {
    const readiness = readinessFor(application.id);
    const supplemental = supplementalByApplication[application.id] ?? { insights: 0, interviews: 0 };
    const supplementalCount = (supplemental.insights ? 2 : 0) + (supplemental.interviews ? 2 : 0);
    const documentCount = readiness?.artifacts.length ?? 0;
    if (!documentCount && !supplementalCount) return <small>No generated files or saved research retained.</small>;
    return <>
      {documentCount ? <a className={`button ${compact ? "button--secondary" : "button--primary"}`} href={`/api/applications/artifacts/${application.id}/bundle?revision=${readiness?.applicationRevision}&generated=${encodeURIComponent(readiness?.generatedAt ?? "")}`} download>
        {compact ? `Download ZIP (${documentCount} files)` : "Download latest files (.zip)"}
      </a> : null}
      <details>
        <summary>{compact ? "Individual files" : `Download individual files (${documentCount + supplementalCount})`}</summary>
        <div className="artifact-actions" aria-label={`Generated files for ${application.opportunity.positionTitle}`}>
          {(readiness?.artifacts ?? []).map((artifact) => <a
            className="button button--secondary"
            href={`/api/applications/artifacts/${application.id}/${artifact.kind}?revision=${readiness?.applicationRevision}&generated=${encodeURIComponent(readiness?.generatedAt ?? "")}`}
            key={artifact.kind}
            download
          >{archiveArtifactLabel(artifact.kind)}</a>)}
          {supplemental.insights ? <>
            <a className="button button--secondary" href={`/api/applications/artifacts/${application.id}/company_insights_md`} download>Company insights (.md)</a>
            <a className="button button--secondary" href={`/api/applications/artifacts/${application.id}/company_insights_json`} download>Company insights (.json)</a>
          </> : null}
          {supplemental.interviews ? <>
            <a className="button button--secondary" href={`/api/applications/artifacts/${application.id}/interview_pack_md`} download>Interview preparation (.md)</a>
            <a className="button button--secondary" href={`/api/applications/artifacts/${application.id}/interview_pack_json`} download>Interview preparation (.json)</a>
          </> : null}
        </div>
      </details>
    </>;
  }

  return <main className="operations-page">
    <header className="operations-hero">
      <StatusBadge tone="current">Private application archives</StatusBadge>
      <p className="eyebrow">Archive management</p>
      <h1>Review, restore, or remove past application work.</h1>
      <p>Each job appears once. Its newest package is shown first, while earlier saved versions remain available without cluttering the page.</p>
      <p className="vault-summary">Embedded vault indexed {vaultSummary.companies} companies, {vaultSummary.jobs} jobs, {vaultSummary.generations} generations, and {vaultSummary.artifacts} generated files. {vaultSummary.caseFiles ?? 0} complete case files are stored in company folders.</p>
      <Link className="text-link" href="/applications/new">Create a new application</Link>
    </header>
    <section className="operations-section">
      {message ? <p className="save-status save-status--success" role="status">{message}</p> : null}
      <div className="archive-management-list">
        {groups.map((group) => {
          const application = group[0];
          const isDismissed = dismissed.has(application.id);
          return <SurfaceCard className="archive-management-card" key={application.id}>
            <div>
              <StatusBadge tone={isDismissed ? "pending" : "complete"}>{isDismissed ? "Archived" : "Active"}</StatusBadge>
              <h2>{application.opportunity.positionTitle}</h2>
              <p>{application.opportunity.companyName}{application.opportunity.location ? ` · ${application.opportunity.location}` : ""}</p>
              <small>Current draft version {(application.draftHistory?.length ?? 0) + 1} · Updated {new Date(application.updatedAt).toLocaleString()} · {application.status.replaceAll("_", " ")}</small>
              {readinessFor(application.id) ? <small className="archive-package-meta">Latest generated files · {readinessFor(application.id)?.paletteId ?? "AI-selected"} palette · {new Date(readinessFor(application.id)!.generatedAt).toLocaleString()}</small> : null}
            </div>
            <div className="archive-management-actions">
              {!isDismissed ? <Link className="button button--primary" href={`/applications/new?applicationId=${encodeURIComponent(application.id)}#application-focus`}>Open studio &amp; refine</Link> : null}
              {application.opportunity.url ? <a className="button button--secondary" href={application.opportunity.url} target="_blank" rel="noreferrer">View posting</a> : null}
              {downloadActions(application)}
              {isDismissed ? <button className="button button--primary" disabled={busyId === application.id} onClick={() => restore(application.id)}>Restore</button> : null}
              <button className="button button--danger" disabled={busyId === application.id} onClick={() => permanentlyDelete(application)}>Permanently delete latest version</button>
            </div>
            {group.length > 1 ? <details className="archive-version-panel">
              <summary>Previous saved versions <span>{group.length - 1}</span></summary>
              <div className="archive-version-list">
                {group.slice(1).map((previous) => {
                  const previousDismissed = dismissed.has(previous.id);
                  return <section className="archive-version-row" key={previous.id}>
                    <div className="archive-version-meta">
                      <StatusBadge tone={previousDismissed ? "pending" : "complete"}>{previousDismissed ? "Archived" : "Saved version"}</StatusBadge>
                      <p><strong>{new Date(previous.updatedAt).toLocaleString()}</strong></p>
                      <small>Revision {previous.revision} · {previous.status.replaceAll("_", " ")}</small>
                    </div>
                    <div className="archive-management-actions archive-version-actions">
                      {downloadActions(previous, true)}
                      {previousDismissed ? <button className="button button--secondary" disabled={busyId === previous.id} onClick={() => restore(previous.id)}>Restore</button> : null}
                      <button className="button button--danger" disabled={busyId === previous.id} onClick={() => permanentlyDelete(previous)}>Permanently delete version</button>
                    </div>
                  </section>;
                })}
              </div>
            </details> : null}
          </SurfaceCard>;
        })}
        {!applications.length ? <SurfaceCard className="archive-management-card"><p>No application archives remain.</p></SurfaceCard> : null}
      </div>
    </section>
  </main>;
}

function groupApplications(applications: ArchivedApplication[]): ArchivedApplication[][] {
  const groups = new Map<string, ArchivedApplication[]>();
  for (const application of applications) {
    const opportunity = application.opportunity;
    const key = opportunity.url?.trim().toLowerCase()
      || `${opportunity.companyName.trim().toLowerCase()}::${opportunity.positionTitle.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), application]);
  }
  return [...groups.values()]
    .map((group) => group.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)))
    .sort((left, right) => Date.parse(right[0].updatedAt) - Date.parse(left[0].updatedAt));
}

function archiveArtifactLabel(kind: string) {
  const labels: Record<string, string> = {
    cv_pdf: "ATS resume PDF",
    cv_source: "ATS resume source",
    cover_letter_pdf: "ATS cover letter PDF",
    cover_letter_source: "Cover letter source",
    ats_text: "ATS plain text",
    designed_resume_html: "Designed resume HTML",
    designed_resume_pdf: "Designed resume PDF",
    resume_docx: "Editable resume DOCX",
    designed_cover_letter_html: "Designed cover letter HTML",
    designed_cover_letter_pdf: "Designed cover letter PDF",
    cover_letter_docx: "Editable cover letter DOCX",
  };
  return labels[kind] ?? kind.replaceAll("_", " ");
}
