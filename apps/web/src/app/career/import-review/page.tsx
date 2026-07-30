import { EvidenceReview } from "@/components/evidence-review";
import { loadExecutiveEvidencePreview } from "@/server/evidence/preview-service";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ImportReviewPage() {
  const preview = await loadExecutiveEvidencePreview();

  if (preview.status === "not_configured") {
    return (
      <div className="state-page state-page--wide">
        <p className="eyebrow">Connect a local source</p>
        <h1>Executive Career OS is not connected yet.</h1>
        <p>
          Set <code>EXECUTIVE_CAREER_OS_PATH</code> in <code>apps/web/.env.local</code>{" "}
          to enable a read-only preview of the 12 allowlisted career-evidence files.
        </p>
        <Link className="button button--secondary" href="/">Return home</Link>
      </div>
    );
  }

  if (preview.status === "error") {
    return (
      <div className="state-page state-page--wide" role="alert">
        <p className="eyebrow">Connection needs attention</p>
        <h1>We could not read the configured evidence source.</h1>
        <p>{preview.message}</p>
        <Link className="button button--secondary" href="/">Return home</Link>
      </div>
    );
  }

  return <EvidenceReview result={preview.result} />;
}
