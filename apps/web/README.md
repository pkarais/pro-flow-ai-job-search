# Pro-Flow Career OS Web

Release: `0.2.0-beta.1` local-first public beta.

This application is localhost-only. It has no authentication or tenant
isolation and must not be deployed to a public URL. Start with the repository
[setup guide](../../SETUP.md) and complete
[user guide](../../docs/USER_GUIDE.md).

The isolated Next.js shell for the guided Pro-Flow Career OS experience.

The dashboard and application workflows use the private canonical record at
`../../career-data/canonical-career.json`. Pro Flow has no runtime dependency
on another career project or checkout.

Phase 4 review decisions are stored under the repository's ignored
`career-data/` directory. Each save:

- validates the request and current canonical schema;
- requires the expected revision;
- retains original evidence and provenance;
- backs up the previous canonical revision;
- atomically replaces the canonical JSON record;
- regenerates compatibility Markdown and a SHA-256 manifest.

The UI exposes confirm, correct, and reject decisions one evidence item at a
time and updates Pro Flow's canonical record directly.

Phase 5 adds `/applications/new`, a local-first application studio. It accepts
a pasted job description as untrusted data, compares it with reviewed
canonical evidence, exposes supported terms and gaps, creates an evidence-linked
draft, requires an initial decision on every material claim, carries completed
approval into later editorial regenerations, and archives the workflow
under `career-data/applications/`. When configured, the server-only OpenAI
writer creates persuasive structured drafts and attaches canonical evidence
IDs to every candidate assertion. Final AI writing fails closed when the
provider is unavailable; no generic fallback is silently saved as a finished
document. The workflow never submits an application.

Set `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.6-sol` in `.env.local`. Requests
use `store: false`; contact fields, pending/rejected evidence, operations
history, and outcomes are not sent to the writing provider.

Phase 6 adds private LaTeX source generation, fixed-tool PDF compilation,
page-count checks, ATS text extraction, keyword/contact checks, allowlisted
artifact viewing, and a mandatory human visual-review confirmation. Install
`lualatex`, `xelatex`, `pdfinfo`, and `pdftotext` on the host to run the
complete gate. Missing tools produce a blocked readiness result; checks cannot
be bypassed in the UI.

Phase 7 adds `/operations`, a guided workspace for fixed-adapter job search,
normalized ranking and deduplication, and guarded application tracking.
Dedicated `/insights` and `/interview` workspaces hold persisted cited company
research, grounded interview preparation, and append-only outcomes. The six portal CLIs require
`bun` on the host. If Bun or one portal fails, that search fails explicitly
without corrupting stored operations. The workspace never submits applications
or contacts employers.

Phase 8 hardens live integration. It installs each Bunli portal's ignored local
dependencies, maps the correct query flags and response fields per portal, and
adds a six-adapter runtime readiness panel backed by
`/api/operations/health`. Local readiness is reported separately from remote
availability: Cloudflare blocks and portal timeouts remain visible, isolated
errors.

The current search experience is U.S.-only. `/operations` offers LinkedIn,
Indeed, USAJOBS, Dice, Built In, and Wellfound, then opens an official recent
job search with the selected role and U.S. location prefilled. Four exhaustive
regions cover all 50 states; a region reveals only its states, and Ctrl/Command
multi-selection creates a separate portal link for each chosen state. Role choices are
derived from reviewed canonical career evidence and prior user-selected
application titles. Users can type an override.
Legacy Danish and non-U.S. skills are disabled. Operations schema v5 filters
their old results without altering application history and privately retains
the latest 50 successful role/location selections for future defaults. It also
persists company research and tombstones application archives related to jobs
the user deleted so they cannot reappear in the active pipeline.

Portal searches run as four groups: LinkedIn + Indeed, USAJOBS + Built In,
Wellfound + Dice, or all six. A single submit launches the selected searches
concurrently. If the browser blocks one or more tabs, the workspace displays
direct fallback links and asks the user to allow pop-ups for localhost.

## Commands

```powershell
npm install
npm run dev
npm run lint
npm test
npm run typecheck
npm run build
```

The app consumes shared contracts from `../../packages/career-core`.
The application studio generates multiple evidence-grounded emphasis
strategies, combines selected strategies into one editable final-polish
instruction, and rewrites the current summary, bullets, and cover letter as a
coordinated package. Only the newest matching company-overview insight is used
as employer context; it never becomes candidate evidence.
Private application revisions can be reviewed, restored, or permanently removed
from `/applications/archive`. That route also refreshes the embedded
`career-data/vault.sqlite` index, writes company/role/generation case folders,
and exposes company insights and interview packs as individual Markdown/JSON
downloads and inside the complete ZIP.

Saved-job cards track completion of documents, company research, and direct
application research. Company overviews include cited salary and role-scope
analysis based on the complete posting and employer/site research. Direct
application research is limited to official careers pages, forms, and
explicitly published recruiting addresses. The `/extension` builder creates a
localhost-only unpacked extension; the toolbar reports installation only after
the extension checks in with the local service.

`/gmail` provides optional local OAuth setup using the narrow `gmail.compose`
scope. Pro Flow can create reviewable Gmail drafts or downloadable `.eml`
packages with selected documents attached, but it never sends email. OAuth
configuration and encrypted tokens remain in ignored `career-data` files.
Email drafts require the selected current files to exist, but page-count and
visual-readiness checks are advisory for email attachment and do not block the
draft. Recipient addresses remain editable; research results are suggestions.
