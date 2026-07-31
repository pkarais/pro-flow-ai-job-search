"use client";

import { useState, type FormEvent } from "react";
import type { ArchivedApplication, OperationsState } from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

export function InterviewWorkspace({ initialApplications, initialState, selfEmail, selfPhone }: { initialApplications: ArchivedApplication[]; initialState: OperationsState; selfEmail: string; selfPhone: string }) {
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

  const latestPack = state.interviews.at(-1);
  return <div className="operations-page">
    <header className="operations-hero">
      <StatusBadge tone="current">Interview workspace</StatusBadge>
      <p className="eyebrow">Preparation and feedback</p>
      <h1>Prepare consistently, then record what happened.</h1>
      <p>Interview packs combine verified application claims with relevant saved company insights. Outcome notes are append-only and never silently change career evidence.</p>
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
        {latestPack ? <InterviewSummary
          pack={latestPack}
          application={initialApplications.find((application) => application.id === latestPack.applicationId)}
          selfEmail={selfEmail}
          selfPhone={selfPhone}
        /> : null}
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

function InterviewSummary({ pack, application, selfEmail, selfPhone }: { pack: OperationsState["interviews"][number]; application?: ArchivedApplication; selfEmail: string; selfPhone: string }) {
  const [shareMessage, setShareMessage] = useState("");
  const [gmailBusy, setGmailBusy] = useState(false);
  const company = application?.opportunity.companyName ?? "Employer";
  const role = application?.opportunity.positionTitle ?? "Interview";
  const lines = [
    `${role} at ${company}`,
    selfEmail ? `Candidate email: ${selfEmail}` : "",
    selfPhone ? `Candidate phone: ${selfPhone}` : "",
    `Stage: ${pack.stage.replaceAll("_", " ")}`,
    pack.scheduledAt ? `Scheduled: ${new Date(pack.scheduledAt).toLocaleString()}` : "",
    "", "LIKELY QUESTIONS",
    ...pack.likelyQuestions.map((question, index) => `${index + 1}. ${question}`),
    "", "GROUNDED BRIDGE ANSWERS",
    ...pack.bridgeAnswers.map((answer, index) => `${index + 1}. ${answer}`),
    "", "QUESTIONS TO ASK",
    ...pack.questionsToAsk.map((question, index) => `${index + 1}. ${question}`),
    "", "VERIFIED TALKING POINTS",
    ...pack.consistencyClaims.map((claim) => `- ${claim}`),
  ].join("\n");
  const subject = `Phone interview brief — ${company} — ${role}`;
  const recipient = encodeURIComponent(selfEmail);
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(lines);
  const mailto = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${encodedSubject}&body=${encodedBody}`;
  const outlook = `https://outlook.office.com/mail/deeplink/compose?to=${recipient}&subject=${encodedSubject}&body=${encodedBody}`;
  const webDraftSafe = gmail.length <= 6_000 && outlook.length <= 6_000;

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(lines);
      setShareMessage("The full brief was copied. Paste it into any email, notes, or messaging application.");
    } catch {
      setShareMessage("The browser blocked clipboard access. Use Download brief instead.");
    }
  }

  async function createConnectedGmailDraft() {
    if (!application) return;
    const gmailWindow = window.open("about:blank", "_blank");
    setGmailBusy(true); setShareMessage("");
    try {
      const response = await fetch("/api/integrations/gmail/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "interview", applicationId: application.id, interviewGeneratedAt: pack.generatedAt }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to create the Gmail draft.");
      setShareMessage("The complete brief was created in Gmail Drafts. Opening it now.");
      if (gmailWindow) gmailWindow.location.href = payload.gmailUrl;
      else setShareMessage("The draft was created in Gmail, but the browser blocked the new tab. Open Gmail Drafts to review it.");
    } catch (caught) {
      gmailWindow?.close();
      setShareMessage(`${caught instanceof Error ? caught.message : "Unable to create the Gmail draft."} Connect Gmail from the Gmail setup page.`);
    } finally { setGmailBusy(false); }
  }

  function downloadBrief() {
    const url = URL.createObjectURL(new Blob([lines], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${company}-${role}-interview-brief.txt`.replace(/[^a-zA-Z0-9._-]+/g, "-");
    link.click();
    URL.revokeObjectURL(url);
    setShareMessage("The full interview brief was downloaded as a text file.");
  }

  function downloadEmailDraft() {
    const eml = [
      `To: ${selfEmail.replace(/[\r\n]+/g, "")}`,
      `Subject: ${subject.replace(/[\r\n]+/g, " ")}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      lines,
      "",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([eml], { type: "message/rfc822;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${company}-${role}-interview-brief.eml`.replace(/[^a-zA-Z0-9._-]+/g, "-");
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setShareMessage("The full email draft was downloaded. Open the .eml file in your email application, review it, and select Send.");
  }

  return <div className="interview-summary">
    <StatusBadge tone={pack.generation?.method === "ai" ? "current" : "neutral"}>{pack.generation?.method === "ai" ? "AI-prepared · evidence grounded" : "Local fallback pack"}</StatusBadge>
    {pack.generation?.note ? <p>{pack.generation.note}</p> : null}
    <h3>Latest pack: {pack.stage.replaceAll("_", " ")}</h3>
    <strong>Likely questions</strong><ul>{pack.likelyQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
    <strong>Grounded bridge answers</strong><ul>{pack.bridgeAnswers.map((answer) => <li key={answer}>{answer}</li>)}</ul>
    <strong>Questions to ask</strong><ul>{pack.questionsToAsk.map((question) => <li key={question}>{question}</li>)}</ul>
    <div className="interview-share-panel">
      <strong>Use this brief on your phone</strong>
      <p>{selfEmail ? <>Recipient: <strong>{selfEmail}</strong>{selfPhone ? <> · Phone on file: <strong>{selfPhone}</strong></> : null}</> : "No saved email address was found; select yourself as the recipient in the draft."}</p>
      <div className="interview-share-actions">
        <button className="button button--primary" type="button" disabled={!selfEmail || gmailBusy} onClick={() => void createConnectedGmailDraft()}>{gmailBusy ? "Creating Gmail draft…" : "Create Gmail draft"}</button>
        {webDraftSafe ? <>
          <a className="button button--secondary" href={gmail} target="_blank" rel="noreferrer">Open Gmail draft</a>
          <a className="button button--secondary" href={outlook} target="_blank" rel="noreferrer">Open Outlook Web draft</a>
          <a className="button button--secondary" href={mailto}>Use default email app</a>
        </> : null}
        <button className="button button--secondary" type="button" onClick={() => void copyBrief()}>Copy full brief</button>
        <button className="button button--secondary" type="button" onClick={downloadBrief}>Download brief (.txt)</button>
        <button className="button button--secondary" type="button" disabled={!selfEmail} onClick={downloadEmailDraft}>Offline .eml fallback</button>
      </div>
      <small>{webDraftSafe ? "Web drafts are available because this brief fits safely within browser URL limits. " : "This brief is too large for a reliable Gmail or Outlook compose URL, so the full local email draft is used instead. "}Review the recipient and select Send; Pro Flow never sends email automatically.</small>
      {shareMessage ? <p className="save-status save-status--success" role="status">{shareMessage}</p> : null}
    </div>
  </div>;
}
