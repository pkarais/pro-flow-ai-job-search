"use client";

import { StatusBadge, SurfaceCard } from "@/components/ui";
import { useEffect, useState, type FormEvent } from "react";

export default function ExtensionSetupPage() {
  const [created, setCreated] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        const response = await fetch("/api/extension/status", { cache: "no-store" });
        const status = await response.json();
        if (active) setCreated(response.ok && status.installed === true);
      } catch {
        if (active) setCreated(false);
      }
    };
    void update();
    const interval = window.setInterval(() => void update(), 5_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  async function generateExtension(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDownloading(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const params = new URLSearchParams({
        name: String(data.get("name") ?? "Pro Flow Job Capture"),
        baseUrl: String(data.get("baseUrl") ?? "http://localhost:3000"),
      });
      const response = await fetch(`/api/extension/package?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "The extension package could not be created.");
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "pro-flow-job-capture.zip";
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "The extension package could not be created.");
    } finally {
      setDownloading(false);
    }
  }

  return <main className="operations-page">
    <header className="operations-hero">
      <StatusBadge tone="current">Fork-friendly browser capture</StatusBadge>
      <p className="eyebrow">Browser extension</p>
      <h1>Create your own Pro Flow capture extension.</h1>
      <p>Generate an unpacked Chrome or Edge extension branded for your fork and connected only to your local Pro Flow workspace.</p>
    </header>
    <section className="operations-section extension-setup-grid">
      <SurfaceCard className="extension-setup-card">
        <h2>Build extension package</h2>
        <p className={created ? "extension-status extension-status--created" : "extension-status extension-status--needed"} role="status">
          {created ? "Installed extension detected by this local Pro Flow workspace." : "No installed extension has checked in with this local Pro Flow workspace."}
        </p>
        <form className="document-details-form" onSubmit={(event) => void generateExtension(event)}>
          <label>Extension name<input name="name" defaultValue="Pro Flow Job Capture" maxLength={60} required /></label>
          <label>Pro Flow base URL<input name="baseUrl" type="url" defaultValue="http://localhost:3000" required /></label>
          <button className="button button--primary" type="submit" disabled={downloading}>{downloading ? "Creating extension…" : "Download extension ZIP"}</button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </SurfaceCard>
      <SurfaceCard className="extension-setup-card">
        <h2>Enable it in Chrome or Edge</h2>
        <p>Browsers require you to approve unpacked local extensions in their extension manager. Pro Flow cannot silently enable one for you.</p>
        <ol>
          <li>Extract the downloaded ZIP.</li>
          <li>Chrome: open <code>chrome://extensions</code>. Edge: open <code>edge://extensions</code>.</li>
          <li>Turn on <strong>Developer mode</strong>.</li>
          <li>Select <strong>Load unpacked</strong> and choose the extracted <code>pro-flow-job-capture</code> folder.</li>
          <li>Make sure the extension card’s toggle is enabled, then pin it from the browser’s Extensions menu.</li>
          <li>If it was already installed before a Pro Flow update, click <strong>Reload</strong> on its extension card.</li>
          <li>Keep Pro Flow running, open a supported job posting, and click the extension once. Its successful capture also verifies installation and turns the left-toolbar label green.</li>
        </ol>
      </SurfaceCard>
      <SurfaceCard className="extension-setup-card extension-security-warning">
        <h2>Local-only boundary</h2>
        <p>The generator accepts only localhost addresses. Each person who forks Pro Flow runs their own private workspace, generates their own extension, and keeps career records on their own computer.</p>
      </SurfaceCard>
    </section>
  </main>;
}
