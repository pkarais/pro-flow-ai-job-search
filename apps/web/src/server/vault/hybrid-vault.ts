import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ArchivedApplication, DocumentReadiness, OperationsState } from "@pro-flow/career-core";

export type HybridVaultSummary = {
  databasePath: string;
  companies: number;
  jobs: number;
  generations: number;
  artifacts: number;
  insights: number;
  interviews: number;
  caseFiles?: number;
};

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 20)}`;
}

function sameOpportunity(application: ArchivedApplication, job: OperationsState["jobs"][number]): boolean {
  return job.url === application.opportunity.url
    || (job.company.trim().toLowerCase() === application.opportunity.companyName.trim().toLowerCase()
      && job.title.trim().toLowerCase() === application.opportunity.positionTitle.trim().toLowerCase());
}

export async function syncHybridVault(
  dataRoot: string,
  applications: ArchivedApplication[],
  readinessRecords: Array<DocumentReadiness | null>,
  operations: OperationsState,
): Promise<HybridVaultSummary> {
  await mkdir(dataRoot, { recursive: true });
  const databasePath = path.join(path.resolve(dataRoot), "vault.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS vault_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, normalized_name TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), title TEXT NOT NULL, location TEXT, url TEXT, payload_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS application_generations (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), revision INTEGER NOT NULL, status TEXT NOT NULL, updated_at TEXT NOT NULL, archive_json_path TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS artifacts (application_id TEXT NOT NULL REFERENCES application_generations(id) ON DELETE CASCADE, kind TEXT NOT NULL, relative_path TEXT NOT NULL, media_type TEXT NOT NULL, PRIMARY KEY (application_id, kind));
    CREATE TABLE IF NOT EXISTS insights (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), generated_at TEXT NOT NULL, model TEXT NOT NULL, payload_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS interviews (application_id TEXT NOT NULL, stage TEXT NOT NULL, generated_at TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY (application_id, stage));
    CREATE TABLE IF NOT EXISTS pipeline (application_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS outcomes (id TEXT PRIMARY KEY, application_id TEXT NOT NULL, recorded_at TEXT NOT NULL, payload_json TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
    CREATE INDEX IF NOT EXISTS idx_generations_job ON application_generations(job_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_insights_job ON insights(job_id, generated_at DESC);
  `);

  try {
    database.exec("BEGIN IMMEDIATE;");
    database.exec("DELETE FROM artifacts; DELETE FROM application_generations; DELETE FROM insights; DELETE FROM interviews; DELETE FROM pipeline; DELETE FROM outcomes; DELETE FROM jobs; DELETE FROM companies;");
    const insertCompany = database.prepare("INSERT OR IGNORE INTO companies (id, normalized_name, display_name) VALUES (?, ?, ?)");
    const insertJob = database.prepare("INSERT OR REPLACE INTO jobs (id, company_id, title, location, url, payload_json) VALUES (?, ?, ?, ?, ?, ?)");
    const jobIds = new Set<string>();

    for (const job of operations.jobs) {
      const normalizedCompany = job.company.trim().toLowerCase();
      const companyId = stableId("company", normalizedCompany);
      insertCompany.run(companyId, normalizedCompany, job.company);
      insertJob.run(job.id, companyId, job.title, job.location ?? null, job.url, JSON.stringify(job));
      jobIds.add(job.id);
    }

    const applicationJobIds = new Map<string, string>();
    for (const application of applications) {
      const opportunity = application.opportunity;
      const matched = operations.jobs.find((job) => sameOpportunity(application, job));
      const jobId = matched?.id ?? stableId("job", opportunity.url || `${opportunity.companyName}:${opportunity.positionTitle}`);
      const normalizedCompany = opportunity.companyName.trim().toLowerCase();
      const companyId = stableId("company", normalizedCompany);
      insertCompany.run(companyId, normalizedCompany, opportunity.companyName);
      if (!jobIds.has(jobId)) {
        insertJob.run(jobId, companyId, opportunity.positionTitle, opportunity.location ?? null, opportunity.url ?? null, JSON.stringify(opportunity));
        jobIds.add(jobId);
      }
      applicationJobIds.set(application.id, jobId);
      database.prepare("INSERT INTO application_generations (id, job_id, revision, status, updated_at, archive_json_path) VALUES (?, ?, ?, ?, ?, ?)")
        .run(application.id, jobId, application.revision, application.status, application.updatedAt, `applications/${application.id}.json`);
      const readiness = readinessRecords.find((record) => record?.applicationId === application.id);
      for (const artifact of readiness?.artifacts ?? []) {
        database.prepare("INSERT INTO artifacts (application_id, kind, relative_path, media_type) VALUES (?, ?, ?, ?)")
          .run(application.id, artifact.kind, `applications/${application.id}/${artifact.relativePath}`, artifact.mediaType);
      }
    }

    for (const insight of operations.companyInsights) {
      let jobId = insight.jobId;
      if (!jobIds.has(jobId)) {
        const normalizedCompany = insight.company.trim().toLowerCase();
        const companyId = stableId("company", normalizedCompany);
        jobId = stableId("job", `${normalizedCompany}:${insight.role}`);
        insertCompany.run(companyId, normalizedCompany, insight.company);
        insertJob.run(jobId, companyId, insight.role, null, null, JSON.stringify({ company: insight.company, role: insight.role }));
        jobIds.add(jobId);
      }
      database.prepare("INSERT INTO insights (id, job_id, generated_at, model, payload_json) VALUES (?, ?, ?, ?, ?)")
        .run(insight.id, jobId, insight.generatedAt, insight.model, JSON.stringify(insight));
    }
    for (const interview of operations.interviews) {
      database.prepare("INSERT INTO interviews (application_id, stage, generated_at, payload_json) VALUES (?, ?, ?, ?)")
        .run(interview.applicationId, interview.stage, interview.generatedAt, JSON.stringify(interview));
    }
    for (const pipeline of operations.pipeline) {
      database.prepare("INSERT INTO pipeline (application_id, payload_json) VALUES (?, ?)").run(pipeline.applicationId, JSON.stringify(pipeline));
    }
    for (const outcome of operations.outcomes) {
      database.prepare("INSERT INTO outcomes (id, application_id, recorded_at, payload_json) VALUES (?, ?, ?, ?)")
        .run(outcome.id, outcome.applicationId, outcome.recordedAt, JSON.stringify(outcome));
    }
    database.prepare("INSERT OR REPLACE INTO vault_meta (key, value) VALUES ('schema_version', '1'), ('last_synced_at', ?)")
      .run(new Date().toISOString());
    database.exec("COMMIT;");

    const count = (table: string) => Number((database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count);
    return {
      databasePath,
      companies: count("companies"),
      jobs: count("jobs"),
      generations: count("application_generations"),
      artifacts: count("artifacts"),
      insights: count("insights"),
      interviews: count("interviews"),
    };
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch {}
    throw error;
  } finally {
    database.close();
  }
}
