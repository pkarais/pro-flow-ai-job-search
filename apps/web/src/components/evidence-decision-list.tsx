"use client";

import {
  type CanonicalEvidenceRecord,
  type CanonicalReviewSummary,
  type ImportedFact,
} from "@pro-flow/career-core";
import { useMemo, useState } from "react";
import { AlertIcon, CheckIcon } from "./icons";
import { StatusBadge } from "./ui";

type DecisionFilter = "all" | "attention" | "reviewed";

type DecisionState = Pick<
  CanonicalEvidenceRecord,
  "decision" | "correctedValue" | "decisionNote" | "decidedAt"
>;

export function EvidenceDecisionList({
  facts,
  initialRecords,
  initialSummary,
  initialCompatibilityValid,
}: {
  facts: ImportedFact[];
  initialRecords: CanonicalEvidenceRecord[];
  initialSummary: CanonicalReviewSummary;
  initialCompatibilityValid: boolean;
}) {
  const [revision, setRevision] = useState(initialSummary.revision);
  const [summary, setSummary] = useState(initialSummary);
  const [compatibilityValid, setCompatibilityValid] = useState(initialCompatibilityValid);
  const [filter, setFilter] = useState<DecisionFilter>("attention");
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>(() =>
    Object.fromEntries(
      initialRecords.map((record) => [
        record.id,
        {
          decision: record.decision,
          correctedValue: record.correctedValue,
          decisionNote: record.decisionNote,
          decidedAt: record.decidedAt,
        },
      ]),
    ),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correction, setCorrection] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const visibleFacts = useMemo(
    () =>
      facts.filter((fact) => {
        const decision = decisions[fact.id]?.decision ?? "pending";
        if (filter === "attention") return decision === "pending";
        if (filter === "reviewed") return decision !== "pending";
        return true;
      }),
    [decisions, facts, filter],
  );

  async function saveDecision(
    fact: ImportedFact,
    decision: "confirmed" | "corrected" | "rejected",
    correctedValue?: string,
  ) {
    if (decision === "rejected") {
      const confirmed = window.confirm(
        "Reject this evidence item? It will remain in the ledger but will be excluded from compatibility views.",
      );
      if (!confirmed) return;
    }

    setSavingId(fact.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/career/evidence-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factId: fact.id,
          expectedRevision: revision,
          decision,
          ...(decision === "corrected" ? { correctedValue } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "The decision could not be saved.");
      const record = body.data.record as CanonicalEvidenceRecord;
      setRevision(body.data.revision);
      setSummary(body.data.summary);
      setCompatibilityValid(body.data.compatibilityValid);
      setDecisions((current) => ({
        ...current,
        [fact.id]: {
          decision: record.decision,
          correctedValue: record.correctedValue,
          decisionNote: record.decisionNote,
          decidedAt: record.decidedAt,
        },
      }));
      setEditingId(null);
      setCorrection("");
      setMessage(
        decision === "confirmed"
          ? "Evidence confirmed and compatibility views updated."
          : decision === "corrected"
            ? "Correction saved and compatibility views updated."
            : "Evidence rejected and excluded from compatibility views.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The decision could not be saved.");
    } finally {
      setSavingId(null);
    }
  }

  function openCorrection(fact: ImportedFact) {
    setEditingId(fact.id);
    setCorrection(decisions[fact.id]?.correctedValue ?? fact.value);
    setError("");
    setMessage("");
  }

  return (
    <>
      <div className="decision-toolbar">
        <div className="decision-progress">
          <span>Review progress</span>
          <strong>{summary.total - summary.pending} of {summary.total}</strong>
          <div className="progress-track" aria-hidden="true">
            <span style={{
              width: `${summary.total ? ((summary.total - summary.pending) / summary.total) * 100 : 0}%`,
            }} />
          </div>
        </div>
        <div className="decision-filters" aria-label="Filter evidence decisions">
          {(["attention", "reviewed", "all"] as const).map((option) => (
            <button
              aria-pressed={filter === option}
              className={filter === option ? "filter-button filter-button--active" : "filter-button"}
              key={option}
              onClick={() => setFilter(option)}
              type="button"
            >
              {option === "attention" ? `Needs review (${summary.pending})` : option === "reviewed" ? `Reviewed (${summary.total - summary.pending})` : `All (${summary.total})`}
            </button>
          ))}
        </div>
      </div>

      <div className="save-status" aria-live="polite">
        {error ? <p className="save-status--error">{error}</p> : null}
        {message ? <p className="save-status--success">{message}</p> : null}
        {!compatibilityValid ? (
          <p className="save-status--error">
            Compatibility views do not match the canonical revision. Stop and repair before continuing.
          </p>
        ) : null}
      </div>

      <div className="fact-list">
        {visibleFacts.map((fact) => {
          const state = decisions[fact.id] ?? { decision: "pending" as const };
          const reviewed = state.decision !== "pending";
          const busy = savingId === fact.id;
          return (
            <article className={`fact-row decision-row decision-row--${state.decision}`} key={fact.id}>
              <div className={fact.status === "conflicting" ? "fact-state fact-state--warning" : "fact-state"}>
                {fact.status === "conflicting" ? <AlertIcon /> : <CheckIcon />}
              </div>
              <div className="fact-copy">
                <div className="fact-meta">
                  <span>{fact.sourceSection ?? "Source evidence"}</span>
                  <StatusBadge tone={
                    state.decision === "confirmed"
                      ? "complete"
                      : state.decision === "corrected"
                        ? "current"
                        : state.decision === "rejected"
                          ? "danger"
                          : fact.status === "conflicting"
                            ? "pending"
                            : "neutral"
                  }>
                    {state.decision === "pending"
                      ? fact.status === "conflicting" ? "Verify first" : "Needs review"
                      : state.decision}
                  </StatusBadge>
                </div>
                <p>{state.decision === "corrected" ? state.correctedValue : fact.value}</p>
                {state.decision === "corrected" ? (
                  <details className="original-evidence">
                    <summary>Show original evidence</summary>
                    <p>{fact.value}</p>
                  </details>
                ) : null}
                <small>{fact.sourcePath}</small>

                {editingId === fact.id ? (
                  <div className="correction-panel">
                    <label htmlFor={`correction-${fact.id}`}>Corrected wording</label>
                    <textarea
                      id={`correction-${fact.id}`}
                      maxLength={10_000}
                      onChange={(event) => setCorrection(event.target.value)}
                      rows={5}
                      value={correction}
                    />
                    <div className="decision-actions">
                      <button
                        className="button button--primary"
                        disabled={busy || !correction.trim()}
                        onClick={() => saveDecision(fact, "corrected", correction.trim())}
                        type="button"
                      >
                        {busy ? "Saving…" : "Save correction"}
                      </button>
                      <button
                        className="button button--secondary"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(null);
                          setCorrection("");
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="decision-actions">
                    <button
                      className="decision-button decision-button--confirm"
                      disabled={busy}
                      onClick={() => saveDecision(fact, "confirmed")}
                      type="button"
                    >
                      {busy ? "Saving…" : reviewed ? "Confirm instead" : "Confirm"}
                    </button>
                    <button
                      className="decision-button"
                      disabled={busy}
                      onClick={() => openCorrection(fact)}
                      type="button"
                    >
                      Correct
                    </button>
                    <button
                      className="decision-button decision-button--reject"
                      disabled={busy}
                      onClick={() => saveDecision(fact, "rejected")}
                      type="button"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {!visibleFacts.length ? (
          <div className="empty-review-state">
            <CheckIcon />
            <h3>No evidence in this view</h3>
            <p>Choose another filter or continue with the next workflow step.</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
