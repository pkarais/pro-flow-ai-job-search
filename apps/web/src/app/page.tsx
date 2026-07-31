import { Dashboard } from "@/components/dashboard";
import { loadAcceptanceDashboard } from "@/server/acceptance/acceptance-service";
import { connection } from "next/server";

export default async function HomePage() {
  await connection();
  const dashboard = await loadAcceptanceDashboard();
  return <Dashboard dashboard={dashboard} />;
}
