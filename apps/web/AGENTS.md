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
