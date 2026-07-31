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
add arbitrary file paths, bulk acceptance, or job-search execution to the
evidence-decision route. Phase 5 application archives must remain under the fixed
`career-data/applications` root, use validated server-generated IDs and
optimistic revisions, and derive claims only from reviewed employer-facing
evidence. Policy records must never be drafted as claims.

AI writing is server-only and may receive only the current opportunity,
confirmed/corrected employer-facing evidence, voice rules, and prohibited-claim
constraints. Use structured output with evidence IDs, validate every citation,
set `store: false`, expose AI versus fallback status, and preserve deterministic
fallbacks. Never send contact fields, pending/rejected evidence, operations
history, or application outcomes to the writing provider.

Phase 6 may execute the fixed document tools `lualatex`, `xelatex`, `pdfinfo`,
and `pdftotext`, plus a configured local Chrome executable through
`playwright-core` for server-rendered HTML-to-PDF conversion. Editable DOCX
files must be created in-process with the fixed `docx` library. Do not load
remote assets or execute arbitrary browser scripts during rendering. All tools
use server-generated filenames inside the fixed application archive. Artifact
reads are restricted to validated application IDs and an explicit
kind-to-filename map. Failed, pending, or stale checks must
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

The root policy's user-initiated browser-capture exception permits a browser
extension to extract exactly one actively viewed posting after an explicit
user click. The server must never fetch the portal page. Capture requests must
come from browser-extension origins, remain single-shot, and store imported
content as untrusted opportunity data.

Future onboarding must write staged evidence inside this project and pass
through explicit user review before entering the canonical profile. Never
read live career evidence from another repository or promote extracted,
inferred, uploaded, or search-preference data directly to verified evidence.
Keep source documents and onboarding progress under the fixed, gitignored
`career-data` root; do not place personal information in tracked fixtures,
source code, logs, URLs, or client bundles.
