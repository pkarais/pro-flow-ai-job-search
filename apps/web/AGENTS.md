<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may
differ from training data. Read the relevant guide in
`node_modules/next/dist/docs/` before changing framework behavior and heed
deprecation notices.
<!-- END:nextjs-agent-rules -->

The shared domain contracts live in `../../packages/career-core`. This web app
must consume those contracts rather than create competing profile, opportunity,
application, or workflow types.

Phase 4 permits canonical evidence decisions only through the strict
`/api/career/evidence-decision` route. Writes must remain under the fixed,
gitignored `career-data` root, use schema validation, expected revisions,
atomic replacement, backups, and deterministic compatibility hashes. Do not
add arbitrary file paths, bulk acceptance, job-search execution, or AI
providers. Phase 5 application archives must remain under the fixed
`career-data/applications` root, use validated server-generated IDs and
optimistic revisions, and derive claims only from reviewed employer-facing
evidence. Policy records must never be drafted as claims.

Phase 6 may execute only the fixed document tools `lualatex`, `xelatex`,
`pdfinfo`, and `pdftotext` with server-generated filenames inside the fixed
application archive. Artifact reads are restricted to validated application
IDs and an explicit kind-to-filename map. Failed, pending, or stale checks must
keep readiness blocked.

Phase 7 may execute only the six fixed portal adapters under `.agents/skills`
through Bun, with user input passed as process arguments rather than shell
commands. Normalize and deduplicate results before persistence, isolate portal
failures, and keep operations data under `career-data/operations.json`.
Pipeline transitions must use `career-core`; readiness-dependent transitions
must verify the matching Phase 6 manifest. Interview packs use verified claims
only, outcomes append history, and no route may submit an application or
contact an employer.
