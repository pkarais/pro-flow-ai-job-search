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

Phase 8 exposes read-only adapter diagnostics through
`/api/operations/health`. Keep portal argument builders explicit and
allowlisted, normalize portal-specific response fields without inventing
missing employer data, and distinguish local runtime readiness from remote
portal availability. Dependency folders and generated Bun lockfiles stay
ignored.

The current U.S.-only search policy supersedes the Phase 7/8 adapter list.
`portalIdSchema` permits only LinkedIn, Indeed, USAJOBS, Dice, Built In, and
Wellfound. `/api/operations/search` may redirect only to those official HTTPS
origins. Searches without public candidate APIs use official prefilled search
pages, never scraping. Operations schema v3 removes legacy non-U.S. jobs while
preserving workflow history and retains at most 50 private search selections.
Never promote those selections to verified career evidence.

Future onboarding work must remain source-neutral. Executive Career OS is one
read-only evidence adapter, not a required user data model. Resume/CV upload,
guided manual entry, existing Pro-Flow import, and future approved sources must
all produce staged evidence with provenance and pass through explicit user
review before entering the canonical profile. Never promote extracted,
inferred, uploaded, or search-preference data directly to verified evidence.
Keep source documents and onboarding progress under the fixed, gitignored
`career-data` root; do not place personal information in tracked fixtures,
source code, logs, URLs, or client bundles.
