import { ApplicationWorkspace } from "@/components/application-workspace";
import { careerDataRoot } from "@/server/canonical/review-service";
import { OperationsStore } from "@/server/operations/operations-store";
import Link from "next/link";

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string | string[] }>;
}) {
  const requestedJobId = (await searchParams).jobId;
  const jobId = typeof requestedJobId === "string" ? requestedJobId : undefined;
  const operations = jobId ? await new OperationsStore(careerDataRoot()).load() : null;
  const job = operations?.jobs.find((item) => item.id === jobId);

  return (
    <>
      <div className="application-archive-link"><Link className="button button--secondary" href="/applications/archive">Manage application archives</Link></div>
      <ApplicationWorkspace
      initialOpportunity={job ? {
        companyName: job.company,
        positionTitle: job.title,
        location: job.location ?? "",
        url: job.url,
        description: job.description ?? "",
      } : undefined}
      />
    </>
  );
}
