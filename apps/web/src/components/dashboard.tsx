import Link from "next/link";
import type { AcceptanceDashboard } from "@/server/acceptance/acceptance-service";
import { ArrowIcon, CheckIcon, CompassIcon, FileIcon, SparkIcon } from "./icons";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

export function Dashboard({ dashboard }: { dashboard: AcceptanceDashboard }) {
  const { plan, snapshot, warning } = dashboard;
  const next = plan.next;

  return (
    <div className="dashboard" id="home">
      <section className="welcome-grid">
        <div className="welcome-copy">
          <StatusBadge tone={plan.percent === 100 ? "complete" : "current"}>
            Guided career workspace
          </StatusBadge>
          <p className="eyebrow">Your private career workspace</p>
          <h1>Move forward with one clear next step.</h1>
          <p className="welcome-lede">
            Live progress now connects your reviewed evidence, searches,
            applications, verified documents, pipeline, interviews, and outcomes.
          </p>
          <div className="welcome-actions">
            <Link className="button button--primary" href={next?.href ?? "/operations"}>
              {next?.action ?? "Review your career progress"} <ArrowIcon />
            </Link>
            <a className="button button--secondary" href="#acceptance-path">
              View the full path
            </a>
          </div>
          {warning ? <p className="dashboard-warning" role="status">{warning}</p> : null}
        </div>

        <SurfaceCard className="next-action-card">
          <div className="next-action-icon"><CompassIcon /></div>
          <div className="next-action-copy">
            <p className="eyebrow">{next ? "Your next best action" : "Acceptance path complete"}</p>
            <h2>{next?.label ?? "Your complete workflow is connected"}</h2>
            <p>
              {next?.detail
                ?? "Every milestone has real persisted evidence. Continue tracking new opportunities and outcomes."}
            </p>
          </div>
          <div className="progress-row" aria-label={`${plan.percent}% of acceptance path complete`}>
            <div className="progress-copy">
              <span>End-to-end readiness</span>
              <strong>{plan.percent}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${plan.percent}%` }} />
            </div>
          </div>
          <Link className="text-link" href={next?.href ?? "/operations"}>
            {next?.action ?? "Open operations"} <ArrowIcon />
          </Link>
        </SurfaceCard>
      </section>

      <section className="stats-grid" aria-label="Live career workflow summary">
        <SurfaceCard className="stat-card">
          <span>Evidence reviewed</span>
          <strong>{snapshot.evidenceReviewed}/{snapshot.evidenceTotal}</strong>
          <small>Canonical career facts</small>
        </SurfaceCard>
        <SurfaceCard className="stat-card">
          <span>Searches</span>
          <strong>{snapshot.searches}</strong>
          <small>Grouped U.S. portal launches</small>
        </SurfaceCard>
        <SurfaceCard className="stat-card">
          <span>Applications</span>
          <strong>{snapshot.applications}</strong>
          <small>{snapshot.readyDocuments} with verified documents</small>
        </SurfaceCard>
        <SurfaceCard className="stat-card stat-card--accent">
          <span>Workflow completion</span>
          <strong>{plan.percent}%</strong>
          <small>{plan.completed} of {plan.steps.length} milestones complete</small>
        </SurfaceCard>
      </section>

      <section className="content-grid">
        <SurfaceCard className="readiness-card" id="acceptance-path">
          <div className="card-header">
            <SectionHeading
              eyebrow="Live acceptance path"
              title="Know what is ready"
              description="Each milestone is calculated from private persisted records, never demo data."
            />
            <StatusBadge tone={plan.percent === 100 ? "complete" : "current"}>
              {plan.completed} of {plan.steps.length}
            </StatusBadge>
          </div>
          <div className="check-list">
            {plan.steps.map((step) => (
              <div className="check-row" key={step.id}>
                <span className={step.complete ? "check-icon check-icon--passed" : "check-icon"}>
                  {step.complete ? <CheckIcon /> : <span aria-hidden="true" />}
                </span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </div>
                <StatusBadge tone={
                  step.status === "complete" ? "complete"
                    : step.status === "current" ? "current" : "pending"
                }>
                  {step.status === "complete" ? "Complete"
                    : step.status === "current" ? "Do this next" : "Up next"}
                </StatusBadge>
              </div>
            ))}
          </div>
          <Link className="button button--secondary button--full" href={next?.href ?? "/operations"}>
            {next?.action ?? "Continue in operations"} <ArrowIcon />
          </Link>
        </SurfaceCard>

        <SurfaceCard className="principles-card">
          <div className="principles-icon"><SparkIcon /></div>
          <p className="eyebrow">Built-in guidance</p>
          <h2>Progress only counts when the underlying work exists.</h2>
          <p>
            The dashboard reads your local records without changing them. A
            generated file does not count as ready until its current revision
            passes the full document gate.
          </p>
          <ul>
            <li><CheckIcon /> One recommended action at a time</li>
            <li><CheckIcon /> Real records instead of fixture statistics</li>
            <li><CheckIcon /> Current-revision document verification</li>
          </ul>
        </SurfaceCard>
      </section>

      <section className="boundary-card" aria-label="Privacy boundary">
        <div><FileIcon /></div>
        <div>
          <strong>Read-only orchestration boundary</strong>
          <p>
            This overview reads only the fixed, gitignored career-data store.
            It cannot submit applications, contact employers, approve claims,
            or bypass any readiness gate.
          </p>
        </div>
      </section>
    </div>
  );
}
