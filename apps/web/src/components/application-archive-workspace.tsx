"use client";

import type { ArchivedApplication, DocumentReadiness } from "@pro-flow/career-core";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge, SurfaceCard } from "./ui";

export function ApplicationArchiveWorkspace({
  initialApplications,
  dismissedApplicationIds,
  initialReadiness,
}: {
  initialApplications: ArchivedApplication[];
  dismissedApplicationIds: string[];
  initialReadiness: Array<DocumentReadiness | null>;
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [dismissed, setDismissed] = useState(new Set(dismissedApplicationIds));
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

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

  return <main className="operations-page">
    <header className="operations-hero">
      <StatusBadge tone="current">Private application archives</StatusBadge>
      <p className="eyebrow">Archive management</p>
      <h1>Review, restore, or remove past application work.</h1>
      <p>Dismissed records stay private and recoverable. Permanent deletion removes the application record and its generated artifacts from this project.</p>
      <Link className="text-link" href="/applications/new">Create a new application</Link>
    </header>
    <section className="operations-section">
      {message ? <p className="save-status save-status--success" role="status">{message}</p> : null}
      <div className="archive-management-list">
        {applications.map((application) => {
          const isDismissed = dismissed.has(application.id);
          const readiness = initialReadiness.find((item) => item?.applicationId === application.id);
          return <SurfaceCard className="archive-management-card" key={application.id}>
            <div>
              <StatusBadge tone={isDismissed ? "pending" : "complete"}>{isDismissed ? "Archived" : "Active"}</StatusBadge>
              <h2>{application.opportunity.positionTitle}</h2>
              <p>{application.opportunity.companyName}{application.opportunity.location ? ` · ${application.opportunity.location}` : ""}</p>
              <small>Updated {new Date(application.updatedAt).toLocaleString()} · Revision {application.revision} · {application.status.replaceAll("_", " ")}</small>
            </div>
            <div className="archive-management-actions">
              {application.opportunity.url ? <a className="button button--secondary" href={application.opportunity.url} target="_blank" rel="noreferrer">View posting</a> : null}
              {readiness?.artifacts.length ? <>
                <a className="button button--primary" href={`/api/applications/artifacts/${application.id}/bundle`} download>
                  Download all files (.zip)
                </a>
                <details>
                  <summary>Download individual files ({readiness.artifacts.length})</summary>
                  <div className="artifact-actions" aria-label={`Generated files for ${application.opportunity.positionTitle}`}>
                    {readiness.artifacts.map((artifact) => <a
                      className="button button--secondary"
                      href={`/api/applications/artifacts/${application.id}/${artifact.kind}`}
                      key={artifact.kind}
                      download
                    >{archiveArtifactLabel(artifact.kind)}</a>)}
                  </div>
                </details>
              </> : <small>No generated document files are retained for this application.</small>}
              {isDismissed ? <button className="button button--primary" disabled={busyId === application.id} onClick={() => restore(application.id)}>Restore</button> : null}
              <button className="button button--danger" disabled={busyId === application.id} onClick={() => permanentlyDelete(application)}>Permanently delete</button>
            </div>
          </SurfaceCard>;
        })}
        {!applications.length ? <SurfaceCard className="archive-management-card"><p>No application archives remain.</p></SurfaceCard> : null}
      </div>
    </section>
  </main>;
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
