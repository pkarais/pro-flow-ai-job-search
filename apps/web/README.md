# Pro-Flow Career OS Web

The isolated Next.js shell for the guided Pro-Flow Career OS experience.

The dashboard uses validated neutral fixtures. Phase 3 can additionally preview
12 explicitly allowlisted Executive Career OS evidence files through a
server-only, read-only importer. It cannot write Pro-Flow profile files, call AI
providers, or execute portal tools.

To enable the local preview, copy `.env.example` to `.env.local` and set
`EXECUTIVE_CAREER_OS_PATH` to the absolute Executive Career OS checkout path.

Phase 4 review decisions are stored under the repository's ignored
`career-data/` directory. Each save:

- validates the request and current canonical schema;
- requires the expected revision;
- retains original evidence and provenance;
- backs up the previous canonical revision;
- atomically replaces the canonical JSON record;
- regenerates compatibility Markdown and a SHA-256 manifest.

The UI exposes confirm, correct, and reject decisions one evidence item at a
time. It does not bulk-approve evidence or modify Executive Career OS.

Phase 5 adds `/applications/new`, a local-first application studio. It accepts
a pasted job description as untrusted data, compares it with reviewed
canonical evidence, exposes supported terms and gaps, creates an evidence-linked
draft, requires a decision on every material claim, and archives the workflow
under `career-data/applications/`. It does not call an AI provider, submit an
application, or create final CV/PDF artifacts.

Phase 6 adds private LaTeX source generation, fixed-tool PDF compilation,
page-count checks, ATS text extraction, keyword/contact checks, allowlisted
artifact viewing, and a mandatory human visual-review confirmation. Install
`lualatex`, `xelatex`, `pdfinfo`, and `pdftotext` on the host to run the
complete gate. Missing tools produce a blocked readiness result; checks cannot
be bypassed in the UI.

Phase 7 adds `/operations`, a guided workspace for fixed-adapter job search,
normalized ranking and deduplication, guarded application tracking, grounded
interview preparation, and append-only outcomes. The six portal CLIs require
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
job search with the selected role and U.S. location prefilled. Role choices are
derived from reviewed career evidence, the connected read-only import preview,
and prior user-selected application titles. Users can type an override.
Legacy Danish and non-U.S. skills are disabled, and operations schema v2
filters their old results without altering application history.

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
