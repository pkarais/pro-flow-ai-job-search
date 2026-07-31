"use client";

import { useState, type FormEvent } from "react";
import type { ArchivedApplication, OperationsState } from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

export function InterviewWorkspace({ initialApplications, initialState }: { initialApplications: ArchivedApplication[]; initialState: OperationsState }) {
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(endpoint: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The operation failed.");
      setState(payload.state);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void post("/api/operations/interview", {
      applicationId: data.get("applicationId"),
      stage: data.get("stage"),
      scheduledAt: data.get("scheduledAt") ? new Date(String(data.get("scheduledAt"))).toISOString() : "",
    });
  }

  function recordOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void post("/api/operations/outcome", {
      applicationId: data.get("applicationId"),
      status: data.get("status"),
      note: data.get("note"),
    });
  }

  return <div className="operations-page">
    <header className="operations-hero">
      <StatusBadge tone="current">Interview workspace</StatusBadge>
      <p className="eyebrow">Preparation and feedback</p>
      <h1>Prepare consistently, then record what happened.</h1>
      <p>Interview packs remain grounded in verified application claims. Outcome notes are append-only and never silently change career evidence.</p>
    </header>
    <section className="operations-section operations-two-column">
      <SurfaceCard className="operations-card">
        <SectionHeading eyebrow="Interview preparation" title="Build a stage-specific consistency pack" />
        <form className="operations-stack-form" onSubmit={prepare}>
          <ApplicationSelect applications={initialApplications} />
          <label>Stage <select name="stage"><option value="phone_screen">Phone screen</option><option value="technical">Technical</option><option value="case">Case</option><option value="final_round">Final round</option></select></label>
          <label>Date and time <input name="scheduledAt" type="datetime-local" /></label>
          <button className="button button--primary" disabled={busy || !initialApplications.length}>Create interview pack</button>
        </form>
        {state.interviews.at(-1) ? <InterviewSummary pack={state.interviews.at(-1)!} /> : null}
      </SurfaceCard>
      <SurfaceCard className="operations-card">
        <SectionHeading eyebrow="Outcome feedback" title="Append what happened" description="Feedback is recorded as reported. It never silently alters scoring or profile facts." />
        <form className="operations-stack-form" onSubmit={recordOutcome}>
          <ApplicationSelect applications={initialApplications} />
          <label>Outcome <select name="status"><option value="in_progress">In progress</option><option value="hired">Hired</option><option value="offer_declined">Offer declined</option><option value="rejected">Rejected</option><option value="no_response">No response</option><option value="interview_only">Interview only</option></select></label>
          <label>What happened? <textarea name="note" required rows={6} maxLength={4000} /></label>
          <button className="button button--primary" disabled={busy || !initialApplications.length}>Record outcome</button>
        </form>
        <p>{state.outcomes.length} outcome update(s) recorded.</p>
      </SurfaceCard>
    </section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
  </div>;
}

function ApplicationSelect({ applications }: { applications: ArchivedApplication[] }) {
  return <label>Application <select name="applicationId">{applications.map((application) => <option value={application.id} key={application.id}>{application.opportunity.companyName} · {application.opportunity.positionTitle}</option>)}</select></label>;
}

function InterviewSummary({ pack }: { pack: OperationsState["interviews"][number] }) {
  return <div className="interview-summary">
    <StatusBadge tone={pack.generation?.method === "ai" ? "current" : "neutral"}>{pack.generation?.method === "ai" ? "AI-prepared · evidence grounded" : "Local fallback pack"}</StatusBadge>
    {pack.generation?.note ? <p>{pack.generation.note}</p> : null}
    <h3>Latest pack: {pack.stage.replaceAll("_", " ")}</h3>
    <strong>Likely questions</strong><ul>{pack.likelyQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
    <strong>Grounded bridge answers</strong><ul>{pack.bridgeAnswers.map((answer) => <li key={answer}>{answer}</li>)}</ul>
    <strong>Questions to ask</strong><ul>{pack.questionsToAsk.map((question) => <li key={question}>{question}</li>)}</ul>
  </div>;
}
