"use client";

import { useState, type FormEvent } from "react";
import {
  canTransition,
  portalGroupPortals,
  type ApplicationStatus,
  type ArchivedApplication,
  type OperationsState,
  type PortalGroupId,
  type PortalRuntimeReport,
  type SearchDefaults,
} from "@pro-flow/career-core";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";
import type { AiMarketInsight } from "@/server/operations/market-insights";
import { locationForScope, US_SEARCH_REGIONS, US_SEARCH_REGION_IDS, type UsSearchRegionId } from "@/lib/us-search-regions";

const statuses: ApplicationStatus[] = [
  "drafting", "factual_review", "document_verification", "ready", "applied",
  "interviewing", "offer", "rejected", "withdrawn",
];

export function OperationsWorkspace({
  initialApplications,
  initialState,
  initialRuntimeReport,
  searchDefaults,
  aiMarketInsight,
}: {
  initialApplications: ArchivedApplication[];
  initialState: OperationsState;
  initialRuntimeReport: PortalRuntimeReport;
  searchDefaults: SearchDefaults;
  aiMarketInsight: AiMarketInsight | null;
}) {
  const [state, setState] = useState(initialState);
  const [runtimeReport, setRuntimeReport] = useState(initialRuntimeReport);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [roleChoice, setRoleChoice] = useState(searchDefaults.roles[0] ?? "__custom__");
  const [regionChoice, setRegionChoice] = useState<UsSearchRegionId | "">("");
  const [stateChoices, setStateChoices] = useState<string[]>([]);
  const [launchMessage, setLaunchMessage] = useState("");
  const [searchLinks, setSearchLinks] = useState<Array<{ label: string; url: string }>>([]);
  const [insightMessage, setInsightMessage] = useState("");

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

  async function generateCompanyInsight(jobId: string, kind: "company_overview" | "direct_application" = "company_overview") {
    setBusy(true);
    setError("");
    setInsightMessage("");
    try {
      let response = await fetch("/api/operations/company-insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId, kind }),
      });
      let payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Company research could not be generated.");
      if (typeof payload.responseId !== "string" || !payload.responseId.startsWith("resp")) {
        throw new Error("Company research did not start correctly because no valid response ID was returned. Restart the local server and try again.");
      }
      setInsightMessage(`${payload.message} You can remain on this page while Pro Flow completes it.`);
      let pollAttempts = 0;
      while (response.status === 202 && pollAttempts < 240) {
        await new Promise((resolve) => window.setTimeout(resolve, 2_500));
        pollAttempts += 1;
        response = await fetch(`/api/operations/company-insights?jobId=${encodeURIComponent(jobId)}&responseId=${encodeURIComponent(payload.responseId)}&kind=${encodeURIComponent(kind)}`, {
          cache: "no-store",
        });
        payload = await response.json();
        if (!response.ok && response.status !== 202) throw new Error(payload.error ?? "Company research could not be generated.");
      }
      if (response.status === 202) throw new Error("Company research is still running after ten minutes. Try again shortly.");
      setState(payload.state);
      setInsightMessage(`${payload.message} Open Insights from the left toolbar to view it.`);
    } catch (insightError) {
      setError(insightError instanceof Error ? insightError.message : "Company research could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  async function removeJob(jobId: string, label: string) {
    if (!window.confirm(`Delete the saved test job “${label}”? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/operations/jobs", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The saved job could not be deleted.");
      setState(payload.state);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The saved job could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function launchSearches(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setLaunchMessage("");
    setSearchLinks([]);
    const data = new FormData(event.currentTarget);
    const group = String(data.get("group")) as PortalGroupId;
    const query = String(data.get("query") ?? "");
    if (!regionChoice) {
      setError("Choose a U.S. region before preparing searches.");
      setBusy(false);
      return;
    }
    const locations = stateChoices.length
      ? stateChoices.map((stateName) => locationForScope(regionChoice, stateName))
      : [locationForScope(regionChoice, "")];
    const labels = new Map(runtimeReport.portals.map((portal) => [portal.portal, portal.label]));
    const redirects = locations.flatMap((location) => portalGroupPortals[group].map((portal) => {
      const params = new URLSearchParams({ portal, query, location });
      return {
        label: `${labels.get(portal) ?? portal} — ${location.replace(", United States", "")}`,
        url: `/api/operations/search?${params.toString()}`,
      };
    }));
    try {
      const results = await Promise.all(locations.map(async (location) => {
        const response = await fetch("/api/operations/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ group, query, location }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? `The ${location} search could not be created.`);
        return payload.searches as Array<{ label: string; url: string }>;
      }));
      setSearchLinks(redirects);
      setLaunchMessage(`Your ${redirects.length} portal-and-state searches are ready across ${locations.length} location scope${locations.length === 1 ? "" : "s"}. Open only the links you want.`);
      if (results.flat().length !== redirects.length) {
        setError("The saved search group did not match the requested portal count.");
      }
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "The grouped search could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const pipelineFor = (application: ArchivedApplication) => state.pipeline.find((item) => item.applicationId === application.id);
  const statusFor = (application: ArchivedApplication): ApplicationStatus =>
    pipelineFor(application)?.status ?? (application.status === "review_complete" ? "document_verification" : "factual_review");
  const applicationExistsFor = (job: OperationsState["jobs"][number]) => initialApplications.some((application) =>
    application.opportunity.url === job.url
    || (application.opportunity.companyName.trim().toLowerCase() === job.company.trim().toLowerCase()
      && application.opportunity.positionTitle.trim().toLowerCase() === job.title.trim().toLowerCase()),
  );

  return (
    <div className="operations-page">
      <header className="operations-hero">
        <StatusBadge tone="current">U.S. career search · Guided workflow</StatusBadge>
        <p className="eyebrow">One connected operating loop</p>
        <h1>Search the right U.S. market with less setup.</h1>
        <p>Choose a U.S. portal group, confirm a role drawn from your career evidence, and use the prefilled U.S. location. One click runs two or all six official recent-job searches.</p>
      </header>

      <section className="operations-section" id="jobs">
        <SectionHeading eyebrow="Job discovery" title="Search trusted U.S. hiring portals" description="Every choice is a U.S.-origin hiring destination. Searches open the portal’s official results page; no unsupported scraping or Danish job boards are used." />
        <SurfaceCard className="portal-readiness-card">
          <div className="portal-readiness-heading">
            <div>
              <p className="eyebrow">Local runtime readiness</p>
              <h3>{runtimeReport.portals.filter((portal) => portal.status === "ready").length} of {runtimeReport.portals.length} adapters ready</h3>
              <p>Official search destinations · Checked {new Date(runtimeReport.checkedAt).toLocaleTimeString()}</p>
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
          <p className="adapter-note">USAJOBS also provides an official API, but it requires approved credentials. The current adapter uses its public official search until those credentials are configured.</p>
        </SurfaceCard>
        <SurfaceCard className="operations-card">
          <form className="operations-search" onSubmit={(event) => void launchSearches(event)}>
            <label>Portal group
              <select name="group" defaultValue="linkedin_indeed">
                <option value="linkedin_indeed">LinkedIn + Indeed</option>
                <option value="usajobs_builtin">USAJOBS + Built In</option>
                <option value="wellfound_dice">Wellfound + Dice</option>
                <option value="all">Run all six portals</option>
              </select>
            </label>
            <label>Role, skill, or job title
              <select
                name={roleChoice === "__custom__" ? undefined : "query"}
                value={roleChoice}
                onChange={(event) => setRoleChoice(event.target.value)}
              >
                {searchDefaults.roles.map((role) => <option value={role} key={role}>{role}</option>)}
                <option value="__custom__">Enter another role…</option>
              </select>
              {roleChoice === "__custom__" ? (
                <input name="query" required maxLength={200} autoFocus placeholder="Type a role, skill, or job title" />
              ) : null}
            </label>
            <label>U.S. region
              <select required value={regionChoice} onChange={(event) => {
                const nextRegion = event.target.value as UsSearchRegionId;
                setRegionChoice(nextRegion);
                setStateChoices([]);
              }}>
                <option value="" disabled>Select a region…</option>
                {US_SEARCH_REGION_IDS.map((id) => <option value={id} key={id}>{US_SEARCH_REGIONS[id].label}</option>)}
              </select>
            </label>
            {regionChoice ? <label>Specific states
              <select multiple size={Math.min(8, US_SEARCH_REGIONS[regionChoice].states.length)} value={stateChoices} onChange={(event) => setStateChoices(Array.from(event.target.selectedOptions, (option) => option.value))}>
                {US_SEARCH_REGIONS[regionChoice].states.map((stateName) => <option value={stateName} key={stateName}>{stateName}</option>)}
              </select>
              <small>Hold Ctrl on Windows or Command on macOS to select multiple states. Leave every state unselected to search the whole selected region.</small>
            </label> : null}
            <button className="button button--primary" type="submit" disabled={busy}>{busy ? "Preparing searches…" : "Prepare recent-job searches"}</button>
          </form>
          <p className="adapter-note">Role suggestions come from {searchDefaults.source === "reviewed_profile" ? "your reviewed career evidence" : searchDefaults.source === "import_preview" ? "your connected career-source preview" : "manual selection because no career source is connected yet"}. Choose an entire region to search broadly or one state to narrow every portal query. New Mexico is Western and North Carolina is Southern; neither is included in the East Coast scope.</p>
          {launchMessage ? <p className="search-launch-message" role="status">{launchMessage}</p> : null}
          {searchLinks.length ? (
            <div className="blocked-searches">
              <strong>Open a portal when you are ready.</strong>
              <p>Each link opens only when you click it. If LinkedIn asks for a security key, cancel it and continue with Indeed or another portal.</p>
              <div>{searchLinks.map((search) => <a className="button button--secondary" href={search.url} target="_blank" rel="noreferrer" key={search.url}>Open {search.label}</a>)}</div>
            </div>
          ) : null}
        </SurfaceCard>
        <SurfaceCard className="operations-card">
          <SectionHeading eyebrow="Bring a job into Pro Flow" title="Save the posting you selected" description="Open the job on Indeed or another approved portal, copy its posting URL, then add the visible title and company here." />
          <form className="operations-stack-form" onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            void post("/api/operations/jobs", {
              portal: data.get("portal"),
              url: data.get("url"),
              title: data.get("title"),
              company: data.get("company"),
              location: data.get("location"),
              description: data.get("description"),
              postedAt: data.get("postedAt"),
            }).then(() => form.reset());
          }}>
            <label>Job portal <select name="portal" defaultValue="indeed-search"><option value="indeed-search">Indeed</option><option value="linkedin-search">LinkedIn</option><option value="usajobs-search">USAJOBS</option><option value="dice-search">Dice</option><option value="builtin-search">Built In</option><option value="wellfound-search">Wellfound</option></select></label>
            <label>Posting URL <input name="url" type="url" required placeholder="https://www.indeed.com/viewjob?jk=…" /></label>
            <label>Job title <input name="title" required maxLength={300} /></label>
            <label>Company <input name="company" required maxLength={300} /></label>
            <label>Location <input name="location" maxLength={500} placeholder="City, State" /></label>
            <label>Posting date (optional) <input name="postedAt" type="date" /></label>
            <label>Job description (optional) <textarea name="description" rows={6} maxLength={50000} /></label>
            <button className="button button--primary" disabled={busy}>{busy ? "Saving job…" : "Bring job into Pro Flow"}</button>
          </form>
        </SurfaceCard>
        {state.jobs.length ? <>
          <div className="blocked-searches"><strong>Saved-job tools</strong><div><button className="button button--secondary" type="button" disabled={busy} onClick={() => void post("/api/operations/rescore", {})}>Rescore saved jobs</button><a className="text-link" href="/api/operations/export?format=csv">Download CSV</a><a className="text-link" href="/api/operations/export?format=json">Download JSON</a></div></div>
          <div className="job-results" aria-label="Previously saved jobs">
          {state.jobs.map((job) => {
            const applicationCreated = applicationExistsFor(job);
            const companyOverviewExists = state.companyInsights.some((report) => report.jobId === job.id && report.kind === "company_overview");
            const companyInsightCreated = state.companyInsights.some((report) => report.jobId === job.id && report.kind === "company_overview" && /market compensation estimate/i.test(report.report));
            const directApplicationCreated = state.companyInsights.some((report) => report.jobId === job.id && report.kind === "direct_application");
            return (
            <SurfaceCard className="job-result-card" key={job.id}>
              <div><StatusBadge tone={job.score >= 60 ? "complete" : "pending"}>{job.score}/100</StatusBadge><small>{job.portal}</small></div>
              <h3>{job.title}</h3>
              <p>{job.company}{job.location ? ` · ${job.location}` : ""}</p>
              <p><strong>Matches:</strong> {job.matchedTerms.join(", ") || "None yet"}</p>
              <p><strong>Gaps:</strong> {job.gaps.join(", ") || "None detected"}</p>
              {job.dealBreakers.length ? <p className="form-error"><strong>Dealbreakers:</strong> {job.dealBreakers.join(", ")}</p> : null}
              {job.duplicateOf ? <p><strong>Possible duplicate:</strong> previously saved job {job.duplicateOf}</p> : null}
              {job.scoringExplanation.length ? <details><summary>Why this score?</summary><ul>{job.scoringExplanation.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
              {job.riskReview ? <details><summary>Posting risk review: {job.riskReview.level} ({job.riskReview.score}/100)</summary>
                {job.riskReview.signals.length ? <ul>{job.riskReview.signals.map((signal) => <li key={`${signal.category}-${signal.message}`}><strong>{signal.severity}:</strong> {signal.message}</li>)}</ul> : <p>No configured risk signals were found. This is not proof that the posting is legitimate.</p>}
              </details> : null}
              <div className="job-action-status" aria-label="Job preparation progress">
                <StatusBadge tone={applicationCreated ? "complete" : "pending"}>{applicationCreated ? "Documents created" : "Documents needed"}</StatusBadge>
                <StatusBadge tone={companyInsightCreated ? "complete" : "pending"}>{companyInsightCreated ? "Company insights + salary complete" : companyOverviewExists ? "Salary update needed" : "Company insights needed"}</StatusBadge>
                <StatusBadge tone={directApplicationCreated ? "complete" : "pending"}>{directApplicationCreated ? "Direct options complete" : "Direct options needed"}</StatusBadge>
              </div>
              {applicationCreated ? <a className="button button--secondary" href="/applications/archive">View created documents</a> : <a className="button button--primary" href={`/applications/new?jobId=${encodeURIComponent(job.id)}`}>
                Create resume &amp; cover letter
              </a>}
              <button className="button button--secondary" type="button" disabled={busy || companyInsightCreated} onClick={() => void generateCompanyInsight(job.id)}>
                {companyInsightCreated ? "AI company insights + salary generated" : companyOverviewExists ? "Update insights with salary analysis" : "Generate AI company insights"}
              </button>
              <button className="button button--secondary" type="button" disabled={busy || directApplicationCreated} onClick={() => void generateCompanyInsight(job.id, "direct_application")}>
                {directApplicationCreated ? "Direct application options found" : "Find direct application options"}
              </button>
              {(companyOverviewExists || directApplicationCreated) ? <a className="text-link" href="/insights">View saved research</a> : null}
              <a className="text-link" href={job.url} rel="noreferrer" target="_blank">Open posting</a>
              <button className="button button--secondary" type="button" disabled={busy} onClick={() => void removeJob(job.id, `${job.company} — ${job.title}`)}>Delete saved job</button>
            </SurfaceCard>
          );})}
          </div>
        </> : null}
        {insightMessage ? <p className="search-launch-message" role="status">{insightMessage}</p> : null}
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

      <section className="operations-section" id="market-insights">
        <SectionHeading eyebrow="Market insight" title="AI demand in U.S. postings" description="Aggregated national context from Indeed Hiring Lab; it never changes an individual job’s match score." />
        <SurfaceCard className="operations-card">
          {aiMarketInsight ? <>
            <StatusBadge tone="current">{aiMarketInsight.trend}</StatusBadge>
            <h3>{aiMarketInsight.share.toFixed(2)}% of U.S. postings mention AI-related terms</h3>
            <p>Latest seven-day trailing observation: {aiMarketInsight.date}.</p>
          </> : <p>The public market dataset is temporarily unavailable. Job discovery and saved jobs are unaffected.</p>}
          <p className="adapter-note">Source: <a className="text-link" href="https://github.com/hiring-lab/ai-tracker" target="_blank" rel="noreferrer">Indeed Hiring Lab AI Tracker</a>, CC BY 4.0.</p>
        </SurfaceCard>
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
