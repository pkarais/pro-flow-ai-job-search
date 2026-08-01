<p align="center">
  <img src="assets/mascot/pip_flight_loop.gif" alt="Pip, the courier bird from the original AI Job Search project" width="200">
</p>

# Pro Flow Career OS

**A private, local-first career operating system for U.S. job discovery,
evidence review, application development, document verification, pipeline
tracking, interview preparation, and outcome learning.**

[![CI](https://github.com/pkarais/pro-flow-ai-job-search/actions/workflows/ci.yml/badge.svg)](https://github.com/pkarais/pro-flow-ai-job-search/actions/workflows/ci.yml)

> **Release status: 0.2.0-beta.1 — local-first public beta.** Pro Flow is
> designed to run on one trusted computer. It has no authentication or
> multi-user isolation. Do not expose port 3000, deploy it to a public URL, or
> publish the private `career-data` directory.

[Quick setup](SETUP.md) · [Complete user and fork guide](docs/USER_GUIDE.md) ·
[Functional and code audit](docs/FUNCTIONAL_AUDIT.md) ·
[Security](SECURITY.md) · [Privacy](PRIVACY.md) · [Third-party notices](THIRD_PARTY_NOTICES.md) ·
[Contributing](CONTRIBUTING.md) · [Release checklist](docs/RELEASE_CHECKLIST.md)

This autonomous repository originated as an attributed fork and substantial extension of
[Mads Lorentzen's AI Job Search](https://github.com/MadsLorentzen/ai-job-search).
It now owns its career evidence, workflow state, application archives, and
document pipeline locally. No predecessor repository is a runtime dependency
or source of truth.

Historical attribution is preserved below, but current behavior and data are
defined entirely within this project.

> This is an independent open-source project. It is not affiliated with,
> endorsed by, sponsored by, or maintained by Anthropic, OpenAI, LinkedIn,
> Indeed, USAJOBS, Dice, Built In, or Wellfound.
>
> It does not automatically submit applications, send messages, or contact
> employers.

## Credits and project lineage

### Original foundation: AI Job Search

The original project was created by
[Mads Lorentzen](https://github.com/MadsLorentzen) and published as
[MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search).

Mads designed and implemented the foundation that this fork builds upon,
including:

- the Claude Code career-assistant workflow;
- `/setup`, `/scrape`, `/rank`, `/apply`, `/interview`, `/outcome`, and the
  supporting commands;
- the candidate-profile and job-evaluation methodology;
- the drafter/reviewer application pattern;
- LaTeX CV and cover-letter generation;
- PDF and ATS verification practices;
- application tracking, interview, follow-up, reporting, and upskilling
  workflows;
- the extensible portal-skill and document-template conventions;
- privacy, security, and contribution guidance;
- the original Pip mascot and project presentation.

Mads built the framework for his own job search and documented that it helped
him move from 69 tailored applications and 20 first interviews to a signed
contract and an AI engineering role. His full account is available through
[his LinkedIn profile](https://www.linkedin.com/in/mads-lorentzen/).

If the original framework is useful to you, support Mads through
[Ko-fi](https://ko-fi.com/madslorentzen) or contribute to the
[upstream repository](https://github.com/MadsLorentzen/ai-job-search).

The original README also credits
[Mikkel Krogholm](https://github.com/mikkelkrogsholm) and his
[skills repository](https://github.com/mikkelkrogsholm/skills) for job-search
CLI skill work. That credit is preserved here.

### Executive Career OS contribution

Executive Career OS was developed as a separate private local Next.js
application by [@pkarais](https://github.com/pkarais). It introduced a curated
career-knowledge corpus and a seven-part, evidence-grounded application-package
concept:

- executive summary;
- tailored résumé;
- cover letter;
- ATS analysis;
- interview talking points;
- factual audit;
- missing-information review.

Those ideas have been incorporated into Pro Flow's own canonical data and
workflow. The former project is no longer read or required at runtime.

### Hybrid integration and refinements

The integration work in this fork was developed by
[@pkarais](https://github.com/pkarais), assisted by OpenAI Codex. It adds:

- a guided, responsive Next.js web application;
- a shared TypeScript contract package;
- project-owned canonical career evidence;
- canonical fact review with provenance and corrections;
- private atomic storage, revisions, backups, and integrity hashes;
- a grounded application studio;
- AI-generated, selectable emphasis strategies that can be blended into one
  coordinated final-polish instruction;
- deterministic fit, claim, and gap analysis;
- document generation and a fail-closed readiness gate;
- guarded application-pipeline transitions;
- grounded interview packs and append-only outcomes;
- local `.eml` application packages and optional Gmail OAuth draft creation;
- a U.S.-only six-portal search experience;
- grouped concurrent searches and remembered search preferences;
- expanded automated tests and integration documentation.

### Open-source projects reviewed during the redesign

Pro Flow's current product direction was also informed by a comparative review
of job-tracking, job-risk, market-data, and résumé-rendering projects:

- [Donzhu2020/job-tracker](https://github.com/Donzhu2020/job-tracker);
- [GhostJobDetector/Ghost-Job-Detector](https://github.com/GhostJobDetector/Ghost-Job-Detector);
- [ebltzr/capstone](https://github.com/ebltzr/capstone);
- [tarunsinghal92/indeedscrapperlatest](https://github.com/tarunsinghal92/indeedscrapperlatest);
- [Indeed Hiring Lab AI Tracker](https://github.com/hiring-lab/ai-tracker);
- [weberwcwei/job-scout](https://github.com/weberwcwei/job-scout);
- [phoinixi/resuml](https://github.com/phoinixi/resuml).

These projects helped frame questions about saved-job workflows, explainable
scoring, risk signals, market context, structured résumé data, theme systems,
and rendering. Except for the cited Indeed Hiring Lab dataset, their source
code was not incorporated. Exact relationships and detected licenses are
documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Pro Flow is now maintained as an independent repository. Its history and the
notices above preserve attribution; the original project is not a configured
runtime dependency and does not need to be added as a Git remote. People who
fork Pro Flow should use this repository—not the historical foundation—as
their upstream.

## Why Pro Flow is different

Most job-search tools solve one isolated task: collect links, rewrite a résumé,
or track an application. Pro Flow treats an application as a connected,
auditable case file. One reviewed career record feeds job comparison,
evidence-grounded writing, company and compensation research, document design,
email preparation, interview preparation, pipeline history, and outcomes.

The result is not an unchecked keyword rewrite. Pro Flow separates four kinds
of information that must not be confused:

- **candidate evidence** supports claims about the applicant;
- **job-posting text** defines the employer's requested scope;
- **company insights** provide cited context for emphasis and questions;
- **policy constraints** control wording but never appear as résumé claims.

AI decides emphasis, sequencing, compression, and persuasive prose within
those boundaries. Deterministic validation checks evidence IDs, document
artifacts, ATS text, contact details, revisions, and readiness. The user makes
the factual decision, inspects the final layout, and sends every application.

## What the hybrid can do

| Capability | Current behavior |
|---|---|
| Career evidence | Reads and updates Pro Flow's private canonical career record |
| Evidence review | Confirms, corrects, or rejects one fact at a time while preserving provenance |
| Canonical profile | Stores reviewed evidence privately with atomic writes, backups, revisions, and SHA-256 integrity checks |
| U.S. job search | Opens official searches on LinkedIn, Indeed, USAJOBS, Dice, Built In, and Wellfound |
| One-click job capture | Captures one actively viewed posting through the optional local browser extension |
| Concurrent portal search | Runs LinkedIn + Indeed, USAJOBS + Built In, Wellfound + Dice, or all six |
| Regional search control | Covers all 50 states across East Coast, Northern, Southern, and Western regions with Ctrl/Command multi-state selection |
| Guided search inputs | Builds up to 40 role/title/skill suggestions from career evidence and user history |
| Search memory | Privately remembers the most recent 50 role and U.S. location selections |
| Opportunity intake | Accepts a company, position, location, and pasted job description |
| Fit assessment | Shows evidence-supported matches, gaps, terms, and eligibility questions |
| Application drafting | Produces persuasive AI-written résumé and cover-letter content with canonical evidence IDs and fails closed when AI writing is unavailable |
| AI final polish | Reanalyzes the current summary, bullets, and cover letter against the complete posting, confirmed career evidence, and only the newest matching company-insights report; users can blend selected emphasis strategies |
| Factual review | Requires an explicit initial decision for every material claim, then carries that completed approval into later editorial regenerations |
| Private archives | Stores reviewed application packages under stable application IDs |
| Hybrid local vault | Builds an embedded SQLite index plus company/role/generation folders containing portable case-file ZIPs |
| Fork extension builder | Generates a named, localhost-only Chrome/Edge capture extension from the left toolbar |
| Extension status | Turns the setup label green only after an installed extension checks in or captures a posting |
| Document generation | Builds one structured resume from verified claims, then produces ATS LaTeX, modern HTML/CSS, designed PDF, editable DOCX, and a cover letter |
| PDF verification | Checks ATS and designed PDFs for page count, extractable text, contact text, keywords, and visual review |
| Pipeline | Enforces safe drafting, review, readiness, applied, interview, offer, rejection, and withdrawal transitions |
| Interview preparation | Builds stage-specific questions and honest gap bridges from verified claims |
| Employer research | Separately saves cited company overviews and verified direct-application routes without guessing contact details |
| Compensation analysis | Tests title/pay alignment against the complete posting, company/site scope, responsibilities, geography, and comparable market roles |
| Portable case files | Downloads documents, research, interview preparation, pipeline, outcomes, and manifests together or as individual Markdown/JSON assets |
| Email preparation | Accepts a typed, pasted, or research-suggested recipient and downloads reviewable `.eml` packages or creates Gmail drafts through optional local OAuth; page-count warnings do not block attachment of generated current files, and Pro Flow never presses Send |
| Outcomes | Appends outcome history without rewriting prior evidence |

## What it deliberately does not do

- It does not automatically apply for jobs.
- It does not send email, LinkedIn messages, or employer outreach. Optional
  Gmail integration creates drafts for the user to review and send.
- It does not scrape portals that lack an approved public candidate-search
  interface.
- It does not turn search preferences into verified career facts.
- It does not place private career data in tracked source files or public web
  assets.
- It does not bypass factual, PDF, ATS, or human-review gates.
- It is not yet a multi-user hosted service with authentication or encrypted
  remote storage.

## Guided workflow

```text
Connect evidence
      |
      v
Review and establish canonical career facts
      |
      v
Choose role + region + one or more U.S. states
      |
      v
Run a portal pair or all six searches
      |
      v
Select a real posting and paste it into Application Studio
      |
      v
Assess fit, supported terms, gaps, and eligibility
      |
      v
Review every drafted claim
      |
      v
Generate CV + cover letter
      |
      v
Pass PDF, ATS, contact, keyword, and visual checks
      |
      v
Track application -> prepare interview -> record outcome
```

The optional browser extension replaces manual field-by-field copying: open
one individual posting and click the extension once. After intake, a saved-job
card is the launch point for company insights, direct-application research,
application writing, and pipeline work. Completed research is read from
**Insights**, interview packs and outcomes from **Interview**, and every
portable generation from **Archive**.

For a step-by-step walkthrough—including extension installation, AI final
polish, document themes, Gmail drafts, and emailing an interview brief to your
phone—see the [complete user guide](docs/USER_GUIDE.md).

## Main web routes

| Route | Purpose |
|---|---|
| `/` | Guided dashboard and workflow orientation |
| `/career/import-review` | Executive evidence connection and canonical fact review |
| `/applications/new` | Opportunity intake, fit assessment, drafting, factual review, and documents |
| `/applications/archive` | Download, restore, or remove company-grouped documents, research, interviews, and case-file ZIPs |
| `/extension` | Generate a localhost-only capture extension for this installation or fork |
| `/operations` | U.S. portal search, saved jobs, risk review, company-research launch, and guarded pipeline |
| `/insights` | Saved, cited company overviews, compensation analysis, and direct-application research |
| `/interview` | Interview preparation and append-only outcome feedback |
| `/gmail` | Optional local Gmail OAuth setup for creating reviewable drafts without sending them |
| `/api/operations/health` | Read-only six-portal readiness report |

Local preview:

```text
http://localhost:3000
```

## U.S.-only portal policy

The active web allowlist is:

1. LinkedIn
2. Indeed
3. USAJOBS
4. Dice
5. Built In
6. Wellfound

The interface offers four search groups:

- **LinkedIn + Indeed**
- **USAJOBS + Built In**
- **Wellfound + Dice**
- **Run all six portals**

Each search uses a validated, prefilled URL on the portal's official HTTPS
origin. If the browser blocks multiple tabs, the interface reports the blocked
searches and provides direct fallback links.

Indeed's documented APIs are oriented toward approved partners, employers, and
job-posting integrations. Indeed also documents a beta MCP connector with Job
Search and Job Detail tools, but currently describes it as available only
through Claude Connector. This project does not scrape Indeed results or claim
that the connector is available to the Pro Flow runtime. The activation-gated
adaptation is documented in
[`docs/integration/indeed-mcp-adaptation.md`](docs/integration/indeed-mcp-adaptation.md).

The optional [`browser-extension`](browser-extension/README.md) reads one job
posting already open in the active tab after an explicit toolbar click. It
prefers Schema.org `JobPosting` data, falls back to visible fields, and sends
one normalized record directly to the local Pro Flow service. The server never
retrieves the portal page. Search-result crawling, scheduled capture,
authentication bypass, and automatic submission remain prohibited.

USAJOBS has an official Search API, but it requires approved credentials. The
current implementation uses the official public USAJOBS search page until
credentials are intentionally configured.

The original Danish portal skills and FreeHire source remain in the repository
for upstream history and rollback, but their `enabled` flags are `false` and
the active U.S.-only workflow does not expose them.

## Career evidence and source of truth

Pro Flow is its own source of truth. The application reads candidate evidence
only from its private canonical record. Historical files and predecessor
repositories do not supplement or override it.

Canonical facts retain:

- source file;
- source section;
- intended profile path;
- verification status;
- conflict information;
- usage restrictions.

### Canonical record

Explicit web-review decisions are stored in:

```text
career-data/canonical-career.json
```

`career-data/` is gitignored. Generated compatibility Markdown files are
derived views, not additional sources of truth. Their revision and SHA-256
hashes must match the canonical record.

Pending and rejected facts cannot become employer-facing claims.

## Private data layout

In addition to the canonical JSON records and application artifacts below,
Pro Flow automatically maintains two local archive views:

```text
career-data/vault.sqlite
career-data/vault/companies/<Company>/<Role>/generations/<Application ID>/
```

Each generation folder contains a portable `case-file.zip` and
`case-index.json`. The SQLite file is an embedded, rebuildable index; it does
not require a database server. Opening **Archive** creates and refreshes both
views. They remain local and gitignored.

```text
career-data/
├── canonical-career.json          # Reviewed career evidence
├── backups/                       # Prior canonical revisions
├── compatibility/                 # Deterministic generated views + manifest
├── applications/                  # Private application archives and documents
└── operations.json                # Search, jobs, pipeline, insights, interviews, outcomes, and dismissed archives
```

Other original private locations remain protected by `.gitignore`, including:

```text
documents/
job_search_tracker.csv
gmail_sync/
reports/
upskill/
```

Never commit real CVs, contact information, diplomas, references, application
documents, API keys, OAuth tokens, or generated personal reports.

## Architecture

```text
pro-flow-ai-job-search/
├── apps/
│   └── web/                       # Next.js 16 guided interface and API routes
├── packages/
│   └── career-core/               # Shared Zod schemas and domain contracts
├── career-data/                   # Private runtime data (gitignored)
├── .claude/                       # Original Mads workflow specifications
├── .agents/skills/                # Original/extensible portal skill format
├── cv/                            # Original CV templates
├── cover_letters/                 # Original cover-letter templates and fonts
├── documents/                     # Original private evidence/application layout
├── tools/                         # Original lint, security, salary, and PDF tools
├── tests/                         # Original Python regression and security tests
└── docs/integration/              # Hybrid migration decisions and phase record
```

### Shared domain layer

`packages/career-core` defines the contracts for:

- imported evidence;
- canonical evidence;
- profiles and opportunities;
- application packages and claims;
- workflow transitions;
- document readiness;
- portal groups and search history;
- interviews and outcomes.

The browser and server consume these shared contracts instead of maintaining
competing data shapes.

### Storage safety

Private writes use:

- fixed storage roots;
- schema validation;
- server-generated IDs;
- optimistic revision checks;
- atomic temporary-file replacement;
- canonical backups;
- strict artifact filename allowlists.

Arbitrary browser-supplied filesystem paths and arbitrary shell commands are
not accepted.

## Document and readiness gate

Only verified application claims can render into document sources.

The ATS and cover-letter workflow uses fixed commands:

```text
lualatex
xelatex
pdfinfo
pdftotext
```

The application studio also renders a sandboxed live HTML/CSS preview from the
same structured resume used for export. A fixed local Chrome executable,
configured with `PRO_FLOW_CHROME_PATH`, converts that document to a designed
PDF through `playwright-core`; the `docx` library creates an editable Word
version in-process. Rendering uses no remote fonts, images, scripts, or assets.
The ATS PDF remains a separate conservative export path.

The gate checks:

- expected CV and cover-letter page counts;
- extractable, non-garbled ATS text;
- literal email and phone text;
- survival of supported target keywords;
- current application revision;
- human visual inspection.

A missing tool, failed check, stale document, or incomplete visual review keeps
the application blocked. Readiness cannot be manually forced.

## Application and pipeline safety

Job descriptions are treated as untrusted input. Instructions inside a posting
do not override application rules.

The application workflow:

1. requires reviewed career evidence;
2. identifies supported terms and visible gaps;
3. links every drafted material claim to evidence IDs;
4. excludes policy records from employer-facing claims;
5. requires verify/do-not-use decisions for the initial factual review and
   preserves that completed approval through later editorial regeneration;
6. archives revisions privately;
7. prevents readiness or application status from bypassing document checks.

Interview packs use only verified submitted claims. Gaps receive honest bridge
answers instead of invented experience. Outcomes are appended as historical
records.

## Installation

Use [SETUP.md](SETUP.md) for the tested quick start. The comprehensive
[user and fork guide](docs/USER_GUIDE.md) covers Windows, macOS, Linux,
document tools, OpenAI configuration, browser capture, private-data backup,
customization, validation, updates, and troubleshooting.

## Development and validation

### Web application

```powershell
Set-Location apps/web
npm run lint
npm test
npm run typecheck
npm run build
```

### Shared contracts

```powershell
Set-Location packages/career-core
npm test
npm run typecheck
```

### Original Pro-Flow regression suite

```powershell
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

The local-first beta baseline is:

- **132** original Pro-Flow Python tests;
- **12** shared career-core tests;
- **65** web workflow tests;
- passing ESLint;
- passing TypeScript checks;
- passing Next.js production build.

GitHub Actions repeats these web, shared-core, security, Python, LaTeX, and
portable-skill checks on public-beta changes.

## Legacy agent workflow

The guided web application supplements rather than erases Mads's original
agent-command framework.

Core commands retained from upstream include:

| Command | Original purpose |
|---|---|
| `/setup` | Build or update the candidate profile |
| `/scrape` | Search enabled portal skills |
| `/rank` | Score and shortlist scraped postings |
| `/apply` | Run the drafter/reviewer application workflow |
| `/interview` | Prepare for a tracked interview |
| `/outcome` | Record outcomes and draft follow-ups |
| `/expand` | Enrich the profile from user-approved public sources |
| `/upskill` | Analyze recurring skill gaps |
| `/html-report` | Generate an offline application dashboard |
| `/notion-sync` | Publish a one-way pipeline view |
| `/gmail-sync` | Propose status updates from email signals |
| `/add-template` | Register a custom document toolchain |
| `/add-portal` | Scaffold a market-specific portal skill |
| `/reset` | Deliberately reset selected private data |

Consult the canonical specifications under `.claude/commands/` and
`.claude/skills/` before modifying legacy behavior.

## Integration history

The hybrid was developed in reversible, test-gated phases:

| Phase | Result |
|---|---|
| 0 | Protected both original project baselines |
| 1 | Added migration documentation and shared contracts |
| 2 | Added the isolated guided Next.js shell |
| 3 | Imported the initial evidence set that became Pro Flow's canonical record |
| 4 | Added canonical profile persistence and guided fact review |
| 5 | Added the grounded application workflow |
| 6 | Added document generation and readiness verification |
| 7 | Added search, pipeline, interview, and outcome operations |
| 8 | Added live adapter diagnostics and integration hardening |
| 9 | Replaced mixed-market search with guided U.S.-only grouped search and private preference memory |
| 10 | Replaced fixture dashboard data with live, read-only end-to-end guidance and next-action readiness |

Detailed design decisions, gates, and rollback points are documented in
[the Executive Career OS migration manifest](docs/integration/executive-career-os-migration.md).

Key hybrid commits include:

```text
507f808  establish shared career core contracts
b334a33  add guided Career OS web shell
e2ae21c  add read-only career evidence review
4d93c6a  add canonical career review workflow
0d0f858  add grounded application workflow
3cece1d  add document readiness gate
763f729  add career operations workspace
ed5376b  harden live portal integration
241cd0a  switch job search to U.S. portals
6506642  show the complete role dropdown
9c8205d  add grouped concurrent portal searches
f2789b7  remember guided search preferences
```

## Current maturity and verified workflow

Pro Flow is a local-first public beta. A complete personal workflow has been
manually exercised from extension capture through AI insights, refined résumé
and cover-letter generation, document review, archive download, Gmail draft
creation, interview-pack generation, emailing the brief to the candidate, and
outcome recording. Automated tests cover the shared contracts, canonical
storage, application workflow, structured résumé, extension packaging,
artifact bundles, shell behavior, security guards, and retained tools.

The beta label remains important. Job-board markup, AI-provider behavior,
browser policies, and local PDF toolchains can change. Users must review facts,
citations, recipient addresses, attachments, and visual output before acting.

Future work may include authentication, encrypted remote storage, multi-user
deployment, store-published browser extensions, and deeper integrations where
official public APIs and their terms permit them.

## Independence and rollback

- Pro Flow is its own source of truth and has no predecessor runtime dependency.
- Historical attribution is preserved in Git history, this README, the MIT
  license, and `THIRD_PARTY_NOTICES.md`.
- Private schemas are versioned and migrated.
- Original source-project files are not deleted as part of hybrid phases.
- Legacy non-U.S. portal skills are disabled, not erased.
- Each integration phase has a discrete commit and rollback point.

## Security and privacy

Review [SECURITY.md](SECURITY.md) before using unfamiliar job postings,
third-party portal skills, provider integrations, or external connectors.

Important boundaries:

- this beta is localhost-only and must not be exposed to the public internet;
- it has no authentication, tenant isolation, or encrypted remote storage;
- all users with access to the local service can access the same career data;

- postings are untrusted content;
- secrets stay in environment variables or approved secret stores;
- provider calls may transmit the supplied prompt context;
- generated documents remain drafts until reviewed;
- employer-facing output must not contain internal paths or review metadata;
- no automated outreach occurs;
- inspect any borrowed portal skill before enabling it.

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for backup and deletion procedures
and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for incorporated and
inspiration-only sources.

## Contributing and updates

For Pro Flow changes, use this repository's
[CONTRIBUTING.md](CONTRIBUTING.md), preserve the attribution and privacy
boundaries, and keep migrations small and testable.

Fork maintainers should configure this Pro Flow repository as their upstream,
review changes before merging, and never overwrite private data or weaken the
ignore and evidence-safety rules.

## License

This repository remains available under the
[MIT License](LICENSE), consistent with Mads Lorentzen's original project.

The license permits use, modification, and distribution while requiring the
copyright and permission notice to be retained. Attribution in this README is
provided to make the technical and creative lineage explicit in addition to
the legal requirements of the license.
