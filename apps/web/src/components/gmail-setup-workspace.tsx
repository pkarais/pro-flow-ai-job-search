"use client";

import { useState, type FormEvent } from "react";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

type Status = { configured: boolean; connected: boolean; email: string };

export function GmailSetupWorkspace({ initialStatus, callbackUrl, error, connected }: { initialStatus: Status; callbackUrl: string; error: string; connected: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState(error || (connected ? `Gmail connected as ${connected}.` : ""));
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    const response = await fetch("/api/integrations/gmail", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: data.get("clientId"), clientSecret: data.get("clientSecret") }) });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.error ?? "Unable to save Gmail settings.");
    setStatus(payload); setMessage("Credentials saved locally. Connect Gmail to finish.");
  }

  async function disconnect() {
    setBusy(true);
    const response = await fetch("/api/integrations/gmail", { method: "DELETE" });
    setStatus(await response.json()); setBusy(false); setMessage("Gmail disconnected. Local OAuth tokens were removed.");
  }

  return <div className="operations-page">
    <header className="operations-hero"><StatusBadge tone={status.connected ? "complete" : "pending"}>{status.connected ? "Gmail connected" : "Gmail setup"}</StatusBadge><p className="eyebrow">One-time connection</p><h1>Create complete Gmail drafts directly from Pro Flow.</h1><p>Pro Flow requests draft permission only. It creates drafts for review and never presses Send.</p></header>
    <section className="operations-section operations-two-column">
      <SurfaceCard className="operations-card"><SectionHeading eyebrow="Google Cloud" title="Create the OAuth credential" />
        <ol><li>Open Google Cloud Console and create or select a project.</li><li>Enable the Gmail API.</li><li>Configure the OAuth consent screen and add your Gmail address as a test user while the app remains in testing.</li><li>Create an OAuth client ID with application type <strong>Web application</strong>.</li><li>Add this exact authorized redirect URI: <code>{callbackUrl}</code></li></ol>
        <div className="artifact-actions"><a className="button button--secondary" href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noreferrer">Enable Gmail API</a><a className="button button--secondary" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Create OAuth credential</a></div>
      </SurfaceCard>
      <SurfaceCard className="operations-card"><SectionHeading eyebrow="Private local settings" title="Connect this Pro Flow installation" description="Credentials and encrypted tokens stay in the gitignored career-data folder." />
        <form className="operations-stack-form" onSubmit={save}><label>Google client ID<input name="clientId" required autoComplete="off" placeholder="…apps.googleusercontent.com" /></label><label>Google client secret<input name="clientSecret" type="password" required autoComplete="new-password" /></label><button className="button button--primary" disabled={busy}>Save credentials locally</button></form>
        {status.configured && !status.connected ? <a className="button button--primary" href="/api/integrations/gmail/connect">Connect Gmail</a> : null}
        {status.connected ? <><p>Connected account: <strong>{status.email}</strong></p><button className="button button--secondary" type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect Gmail</button></> : null}
        {message ? <p className={error ? "form-error" : "save-status save-status--success"} role="status">{message}</p> : null}
      </SurfaceCard>
    </section>
  </div>;
}
