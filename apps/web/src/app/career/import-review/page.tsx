import { EvidenceReview } from "@/components/evidence-review";
import { loadCanonicalReview } from "@/server/canonical/review-service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ImportReviewPage() {
  const canonical = await loadCanonicalReview();
  if (!canonical.profile || !canonical.evidence) {
    return (
      <div className="state-page state-page--wide">
        <p className="eyebrow">Canonical career profile</p>
        <h1>Pro Flow has no career evidence yet.</h1>
        <p>
          Add career evidence to this project&apos;s private <code>career-data</code> workspace
          before starting applications.
        </p>
        <Link className="button button--secondary" href="/">Return home</Link>
      </div>
    );
  }

  return (
    <EvidenceReview
      canonicalProfile={canonical.profile}
      compatibilityValid={canonical.compatibilityValid}
      result={canonical.evidence}
      reviewSummary={canonical.summary}
    />
  );
}
