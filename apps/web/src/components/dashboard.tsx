import {
  fixturePipeline,
  fixtureProfile,
  fixtureReadinessChecks,
  fixtureWorkflow,
} from "@/lib/fixtures";
import Link from "next/link";
import { ArrowIcon, CheckIcon, CompassIcon, FileIcon, SparkIcon } from "./icons";
import { SectionHeading, StatusBadge, SurfaceCard } from "./ui";

const completedChecks = fixtureReadinessChecks.filter(
  (check) => check.status === "passed",
).length;
const completionPercent = Math.round(
  (completedChecks / fixtureReadinessChecks.length) * 100,
);

export function Dashboard() {
  return (
    <div className="dashboard" id="home">
      <section className="welcome-grid">
        <div className="welcome-copy">
          <StatusBadge tone="current">Foundation stage</StatusBadge>
          <p className="eyebrow">Good morning, {fixtureProfile.identity.fullName.value}</p>
          <h1>Build your next move on facts you can stand behind.</h1>
          <p className="welcome-lede">
            One guided workspace for your career story, job search, applications,
            interviews, and the decisions that connect them.
          </p>
          <div className="welcome-actions">
            <Link className="button button--primary" href="/career/import-review">
              Review evidence <ArrowIcon />
            </Link>
            <a className="button button--secondary" href="#workflow">
              See how it works
            </a>
          </div>
        </div>

        <SurfaceCard className="next-action-card">
          <div className="next-action-icon"><CompassIcon /></div>
          <div className="next-action-copy">
            <p className="eyebrow">Your next best action</p>
            <h2>Complete your career history</h2>
            <p>
              A verified timeline gives fit scoring and application drafts the
              evidence they need to stay accurate.
            </p>
          </div>
          <div className="progress-row" aria-label={`${completionPercent}% of profile setup complete`}>
            <div className="progress-copy">
              <span>Profile readiness</span>
              <strong>{completionPercent}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
          <Link className="text-link" href="/career/import-review">
            Review imported evidence <ArrowIcon />
          </Link>
        </SurfaceCard>
      </section>

      <section className="stats-grid" aria-label="Career pipeline summary">
        {fixturePipeline.map((item) => (
          <SurfaceCard className="stat-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </SurfaceCard>
        ))}
        <SurfaceCard className="stat-card stat-card--accent">
          <span>Profile readiness</span>
          <strong>{completionPercent}%</strong>
          <small>{completedChecks} of {fixtureReadinessChecks.length} foundations ready</small>
        </SurfaceCard>
      </section>

      <section className="content-grid">
        <SurfaceCard className="readiness-card" id="career">
          <div className="card-header">
            <SectionHeading
              eyebrow="Career foundation"
              title="Know what is ready"
              description="Every item is checked before it shapes a recommendation or application."
            />
            <StatusBadge tone="current">{completedChecks} of {fixtureReadinessChecks.length}</StatusBadge>
          </div>
          <div className="check-list">
            {fixtureReadinessChecks.map((check) => {
              const passed = check.status === "passed";
              return (
                <div className="check-row" key={check.id}>
                  <span className={passed ? "check-icon check-icon--passed" : "check-icon"}>
                    {passed ? <CheckIcon /> : <span aria-hidden="true" />}
                  </span>
                  <div>
                    <strong>{check.label}</strong>
                    <p>{check.detail}</p>
                  </div>
                  <StatusBadge tone={passed ? "complete" : "pending"}>
                    {passed ? "Ready" : "Needs attention"}
                  </StatusBadge>
                </div>
              );
            })}
          </div>
          <Link className="button button--secondary button--full" href="/career/import-review">
            Open evidence review <ArrowIcon />
          </Link>
        </SurfaceCard>

        <SurfaceCard className="principles-card">
          <div className="principles-icon"><SparkIcon /></div>
          <p className="eyebrow">Built-in guidance</p>
          <h2>You should never have to guess what comes next.</h2>
          <p>
            Pro-Flow separates required decisions from optional improvements,
            explains why each step matters, and keeps unsupported claims out of
            employer-facing documents.
          </p>
          <ul>
            <li><CheckIcon /> One recommended action at a time</li>
            <li><CheckIcon /> Evidence shown before claims are approved</li>
            <li><CheckIcon /> Readiness gates before submission</li>
          </ul>
        </SurfaceCard>
      </section>

      <section className="workflow-section" id="workflow">
        <SectionHeading
          eyebrow="The guided path"
          title="From career foundation to better outcomes"
          description="The interface reveals complexity only when you need it."
        />
        <div className="workflow-grid">
          {fixtureWorkflow.map((step) => (
            <article className={`workflow-step workflow-step--${step.status}`} key={step.number}>
              <div className="workflow-number">{step.number}</div>
              <StatusBadge tone={step.status === "current" ? "current" : "neutral"}>
                {step.status === "current" ? "You are here" : "Up next"}
              </StatusBadge>
              <h3>{step.label}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="boundary-card" aria-label="Phase 2 data boundary">
        <div><FileIcon /></div>
        <div>
          <strong>Safe fixture boundary</strong>
          <p>
            This Phase 2 shell uses neutral demonstration data only. Personal
            career evidence, AI generation, portal search, and filesystem writes
            remain disconnected until their dedicated safety gates are complete.
          </p>
        </div>
      </section>

      <div className="anchor-targets" aria-hidden="true">
        <span id="jobs" />
        <span id="applications" />
        <span id="interview" />
        <span id="insights" />
      </div>
    </div>
  );
}
