import { EvidenceReview } from "@/components/evidence-review";
import { loadCanonicalReview } from "@/server/canonical/review-service";
import Link from "next/link";
import { ResumeUpload } from "@/components/resume-upload";

export const dynamic = "force-dynamic";

export default async function ImportReviewPage() {
  const canonical = await loadCanonicalReview();
  if (!canonical.profile || !canonical.evidence) {
    return (
      <div className="state-page state-page--wide">
        <p className="eyebrow">Canonical career profile</p>
        <h1>Pro Flow has no career evidence yet.</h1>
        <p>Upload a résumé to create your private career record. Nothing is saved until you review and confirm the extracted evidence.</p>
        <ResumeUpload revision={0} />
        <Link className="back-link" href="/">Return home</Link>
      </div>
    );
  }

  return (
    <>
      <section className="review-section resume-upload-section">
        <p className="eyebrow">Import evidence</p>
        <h2>Upload a résumé</h2>
        <p>Extract a PDF or DOCX locally, then choose exactly which items to add to your career record.</p>
        <ResumeUpload revision={canonical.summary.revision} />
      </section>
      <EvidenceReview
        canonicalProfile={canonical.profile}
        compatibilityValid={canonical.compatibilityValid}
        result={canonical.evidence}
        reviewSummary={canonical.summary}
      />
    </>
  );
}
