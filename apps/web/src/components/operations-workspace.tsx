"use client";

import { useState, type FormEvent } from "react";
import {
  canTransition,
  type ApplicationStatus,
  type ArchivedApplication,
  type OperationsState,
  type PortalRuntimeReport,
} from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

const statuses: ApplicationStatus[] = [
  "drafting", "factual_review", "document_verification", "ready", "applied",
  "interviewing", "offer", "rejected", "withdrawn",
];

export function OperationsWorkspace({
  initialApplications,
  initialState,
  initialRuntimeReport,
}: {
  initialApplications: ArchivedApplication[];
  initialState: OperationsState;
  initialRuntimeReport: PortalRuntimeReport;
}) {
  const [state, setState] = useState(initialState);
  const [runtimeReport, setRuntimeReport] = useState(initialRuntimeReport);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(endpoint: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "The operation failed.");
        return;
      }
      setState(payload.state);
    } catch {
      setError("The local service could not be reached. Confirm the preview is running and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshRuntime() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/operations/health");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Runtime check failed.");
      setRuntimeReport(payload);
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError.message : "Runtime check failed.");
    } finally {
      setBusy(false);
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void post("/api/operations/search", {
      portal: data.get("portal"),
      query: data.get("query"),
      location: data.get("location"),
      limit: 10,
    });
  }

  const pipelineFor = (application: ArchivedApplication) => state.pipeline.find((item) => item.applicationId === application.id);
  const statusFor = (application: ArchivedApplication): ApplicationStatus =>
    pipelineFor(application)?.status ?? (application.status === "review_complete" ? "document_verification" : "factual_review");

  return (
    <div className="operations-page">
      <header className="operations-hero">
        <StatusBadge tone="current">Phase 8 · Integration acceptance</StatusBadge>
        <p className="eyebrow">One connected operating loop</p>
        <h1>Discover, progress, prepare, and learn.</h1>
        <p>Portal failures stay isolated. Pipeline changes are validated. Interview guidance stays consistent with verified application claims, and outcomes append history rather than rewrite it.</p>
      </header>

      <section className="operations-section" id="jobs">
        <SectionHeading eyebrow="Job discovery" title="Search through normalized portal adapters" description="Live portal CLIs return one shared job shape. Results are deduplicated and ranked against reviewed evidence." />
        <SurfaceCard className="portal-readiness-card">
          <div className="portal-readiness-heading">
            <div>
              <p className="eyebrow">Local runtime readiness</p>
              <h3>{runtimeReport.portals.filter((portal) => portal.status === "ready").length} of {runtimeReport.portals.length} adapters ready</h3>
              <p>Bun {runtimeReport.bunVersion ?? "not detected"} · Checked {new Date(runtimeReport.checkedAt).toLocaleTimeString()}</p>
            </div>
            <button className="button button--secondary" type="button" disabled={busy} onClick={() => void refreshRuntime()}>Recheck adapters</button>
          </div>
          <div className="portal-readiness-grid">
            {runtimeReport.portals.map((portal) => (
              <div className="portal-readiness-item" key={portal.portal}>
                <StatusBadge tone={portal.status === "ready" ? "complete" : portal.status === "needs_setup" ? "pending" : "danger"}>
                  {portal.status.replaceAll("_", " ")}
                </StatusBadge>
                <strong>{portal.label}</strong>
                <small>{portal.message}</small>
              </div>
            ))}
          </div>
          <p className="adapter-note">A ready adapter can still report a temporary portal-side block or timeout. Those failures remain isolated and never store partial results.</p>
        </SurfaceCard>
        <SurfaceCard className="operations-card">
          <form className="operations-search" onSubmit={search}>
            <label>Portal
              <select name="portal" defaultValue="freehire-search">
                <option value="freehire-search">FreeHire</option>
                <option value="linkedin-search">LinkedIn</option>
                <option value="jobindex-search">Jobindex</option>
                <option value="jobbank-search">Jobbank</option>
                <option value="jobdanmark-search">Jobdanmark</option>
                <option value="jobnet-search">Jobnet</option>
              </select>
            </label>
            <label>Role or skill <input name="query" required maxLength={200} /></label>
            <label>Location <input name="location" maxLength={200} placeholder="Required for LinkedIn" /></label>
            <button className="button button--primary" disabled={busy}>Search recent jobs</button>
          </form>
          <p className="adapter-note">Each portal receives its own supported query flags. Location is passed directly where supported and safely included in the keyword query elsewhere.</p>
        </SurfaceCard>
        <div className="job-results">
          {state.jobs.map((job) => (
            <SurfaceCard className="job-result-card" key={job.id}>
              <div><StatusBadge tone={job.score >= 60 ? "complete" : "pending"}>{job.score}/100</StatusBadge><small>{job.portal}</small></div>
              <h3>{job.title}</h3>
              <p>{job.company}{job.location ? ` · ${job.location}` : ""}</p>
              <p><strong>Matches:</strong> {job.matchedTerms.join(", ") || "None yet"}</p>
              <p><strong>Gaps:</strong> {job.gaps.join(", ") || "None detected"}</p>
              <a className="text-link" href={job.url} rel="noreferrer" target="_blank">Open posting</a>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="operations-section" id="pipeline">
        <SectionHeading eyebrow="Application pipeline" title="Every status change follows a safe path" description="Ready and Applied remain locked unless the current documents passed Phase 6." />
        <div className="pipeline-list">
          {initialApplications.length ? initialApplications.map((application) => {
            const record = pipelineFor(application);
            const current = statusFor(application);
            const nextStatuses = statuses.filter((status) => canTransition(current, status));
            return (
              <SurfaceCard className="pipeline-card" key={application.id}>
                <div>
                  <StatusBadge tone={current === "ready" || current === "applied" ? "complete" : "pending"}>{current.replaceAll("_", " ")}</StatusBadge>
                  <h3>{application.opportunity.positionTitle}</h3>
                  <p>{application.opportunity.companyName}</p>
                  <small>{record?.events.length ?? 0} recorded transition(s)</small>
                </div>
                <form onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void post("/api/operations/pipeline", {
                    applicationId: application.id,
                    expectedRevision: record?.revision ?? 0,
                    to: data.get("to"),
                    note: data.get("note"),
                  });
                }}>
                  <label>Next status <select name="to">{nextStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label>Note <input name="note" maxLength={2000} /></label>
                  <button className="button button--secondary" disabled={busy || !nextStatuses.length}>Update pipeline</button>
                </form>
              </SurfaceCard>
            );
          }) : <p>No application archives yet. Start with the Application Studio.</p>}
        </div>
      </section>

      <section className="operations-section operations-two-column" id="interview">
        <SurfaceCard className="operations-card" id="outcomes">
          <SectionHeading eyebrow="Interview preparation" title="Build a stage-specific consistency pack" />
          <form className="operations-stack-form" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void post("/api/operations/interview", {
              applicationId: data.get("applicationId"),
              stage: data.get("stage"),
              scheduledAt: data.get("scheduledAt") ? new Date(String(data.get("scheduledAt"))).toISOString() : "",
            });
          }}>
            <ApplicationSelect applications={initialApplications} />
            <label>Stage <select name="stage"><option value="phone_screen">Phone screen</option><option value="technical">Technical</option><option value="case">Case</option><option value="final_round">Final round</option></select></label>
            <label>Date and time <input name="scheduledAt" type="datetime-local" /></label>
            <button className="button button--primary" disabled={busy || !initialApplications.length}>Create interview pack</button>
          </form>
          {state.interviews.at(-1) ? <InterviewSummary pack={state.interviews.at(-1)!} /> : null}
        </SurfaceCard>

        <SurfaceCard className="operations-card">
          <SectionHeading eyebrow="Outcome feedback" title="Append what happened" description="Feedback is recorded as reported. It never silently alters scoring or profile facts." />
          <form className="operations-stack-form" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void post("/api/operations/outcome", {
              applicationId: data.get("applicationId"),
              status: data.get("status"),
              note: data.get("note"),
            });
          }}>
            <ApplicationSelect applications={initialApplications} />
            <label>Outcome <select name="status"><option value="in_progress">In progress</option><option value="hired">Hired</option><option value="offer_declined">Offer declined</option><option value="rejected">Rejected</option><option value="no_response">No response</option><option value="interview_only">Interview only</option></select></label>
            <label>What happened? <textarea name="note" required rows={6} maxLength={4000} /></label>
            <button className="button button--primary" disabled={busy || !initialApplications.length}>Record outcome</button>
          </form>
          <p>{state.outcomes.length} outcome update(s) recorded.</p>
        </SurfaceCard>
      </section>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

function ApplicationSelect({ applications }: { applications: ArchivedApplication[] }) {
  return <label>Application <select name="applicationId">{applications.map((application) => <option value={application.id} key={application.id}>{application.opportunity.companyName} · {application.opportunity.positionTitle}</option>)}</select></label>;
}

function InterviewSummary({ pack }: { pack: OperationsState["interviews"][number] }) {
  return <div className="interview-summary"><h3>Latest pack: {pack.stage.replaceAll("_", " ")}</h3><strong>Likely questions</strong><ul>{pack.likelyQuestions.map((question) => <li key={question}>{question}</li>)}</ul><strong>Questions to ask</strong><ul>{pack.questionsToAsk.map((question) => <li key={question}>{question}</li>)}</ul></div>;
}
