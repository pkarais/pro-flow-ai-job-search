<p align="center">
  <img src="assets/mascot/pip_flight_loop.gif" alt="Pip, the courier bird from the original AI Job Search project" width="200">
</p>

# Pro Flow Career OS

**A private, local-first career operating system for U.S. job discovery,
evidence review, application development, document verification, pipeline
tracking, interview preparation, and outcome learning.**

[![CI](https://github.com/pkarais/pro-flow-ai-job-search/actions/workflows/ci.yml/badge.svg)](https://github.com/pkarais/pro-flow-ai-job-search/actions/workflows/ci.yml)

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
- deterministic fit, claim, and gap analysis;
- document generation and a fail-closed readiness gate;
- guarded application-pipeline transitions;
- grounded interview packs and append-only outcomes;
- a U.S.-only six-portal search experience;
- grouped concurrent searches and remembered search preferences;
- expanded automated tests and integration documentation.

Git remotes preserve the relationship:

```text
origin    https://github.com/pkarais/pro-flow-ai-job-search.git
upstream  https://github.com/MadsLorentzen/ai-job-search.git
```

## What the hybrid can do

| Capability | Current behavior |
|---|---|
| Career evidence | Reads and updates Pro Flow's private canonical career record |
| Evidence review | Confirms, corrects, or rejects one fact at a time while preserving provenance |
| Canonical profile | Stores reviewed evidence privately with atomic writes, backups, revisions, and SHA-256 integrity checks |
| U.S. job search | Opens official searches on LinkedIn, Indeed, USAJOBS, Dice, Built In, and Wellfound |
| One-click job capture | Captures one actively viewed posting through the optional local browser extension |
| Concurrent portal search | Runs LinkedIn + Indeed, USAJOBS + Built In, Wellfound + Dice, or all six |
| Guided search inputs | Builds up to 40 role/title/skill suggestions from career evidence and user history |
| Search memory | Privately remembers the most recent 50 role and U.S. location selections |
| Opportunity intake | Accepts a company, position, location, and pasted job description |
| Fit assessment | Shows evidence-supported matches, gaps, terms, and eligibility questions |
| Application drafting | Produces persuasive AI-written résumé and cover-letter content with canonical evidence IDs and a deterministic fallback |
| Factual review | Requires an explicit decision for every material drafted claim |
| Private archives | Stores reviewed application packages under stable application IDs |
| Document generation | Builds one structured resume from verified claims, then produces ATS LaTeX, modern HTML/CSS, designed PDF, editable DOCX, and a cover letter |
| PDF verification | Checks ATS and designed PDFs for page count, extractable text, contact text, keywords, and visual review |
| Pipeline | Enforces safe drafting, review, readiness, applied, interview, offer, rejection, and withdrawal transitions |
| Interview preparation | Builds stage-specific questions and honest gap bridges from verified claims |
| Outcomes | Appends outcome history without rewriting prior evidence |

## What it deliberately does not do

- It does not automatically apply for jobs.
- It does not send email, LinkedIn messages, or employer outreach.
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
Choose role + U.S. location
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

## Main web routes

| Route | Purpose |
|---|---|
| `/` | Guided dashboard and workflow orientation |
| `/career/import-review` | Executive evidence connection and canonical fact review |
| `/applications/new` | Opportunity intake, fit assessment, drafting, factual review, and documents |
| `/applications/archive` | View, restore, or permanently delete private application archives |
| `/operations` | U.S. portal search, saved jobs, risk review, company-research launch, and guarded pipeline |
| `/insights` | Saved, cited AI company-research reports |
| `/interview` | Interview preparation and append-only outcome feedback |
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
5. requires verify/do-not-use decisions;
6. archives revisions privately;
7. prevents readiness or application status from bypassing document checks.

Interview packs use only verified submitted claims. Gaps receive honest bridge
answers instead of invented experience. Outcomes are appended as historical
records.

## Installation

### Prerequisites

- Node.js 20 or newer
- npm
- Python 3.10 or newer
- Git
- MiKTeX, TeX Live, MacTeX, or another distribution providing `lualatex` and
  `xelatex`
- Poppler tools providing `pdfinfo` and `pdftotext`
- Bun is optional for retained legacy CLI skills; the current U.S. web search
  uses official search destinations and does not require Bun

### Clone

```powershell
git clone https://github.com/pkarais/pro-flow-ai-job-search.git
Set-Location pro-flow-ai-job-search
```

To retain the original project relationship:

```powershell
git remote add upstream https://github.com/MadsLorentzen/ai-job-search.git
```

### Install the web application

```powershell
Set-Location apps/web
npm install
```

### Configure local AI writing

Copy the web environment template:

```powershell
Copy-Item .env.example .env.local
```

Set local AI credentials in `apps/web/.env.local`:

```text
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

Do not place provider keys or personal information in `.env.example`.

### Start the guided interface

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

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

At the completion of the documented Phase 10 work, the validated baseline is:

- **132** original Pro-Flow Python tests;
- **12** shared career-core tests;
- **35** web workflow tests;
- passing ESLint;
- passing TypeScript checks;
- passing Next.js production build.

The protected Executive Career OS baseline separately passed its original
12-test suite and TypeScript typecheck.

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

## Current maturity and remaining work

The major product surfaces and the live acceptance dashboard are implemented,
but a real personal acceptance run is still required.

The next meaningful milestone is:

1. review and save real career evidence into the canonical profile;
2. run a grouped U.S. search for a genuine target role;
3. choose a real posting and paste it into Application Studio;
4. complete fit assessment and claim review;
5. generate and verify the PDFs;
6. pass human visual review;
7. move the application through the guarded pipeline;
8. generate an interview pack;
9. record an outcome.

Additional future work may include:

- a safe provider adapter for Executive Career OS-style structured AI
  generation;
- direct posting capture that removes manual copy/paste without violating
  portal rules;
- internal U.S. result ingestion where an official API permits it;
- authentication and encrypted remote storage;
- multi-user deployment and access controls;
- consolidated documentation that retires superseded historical adapter notes.

## Independence and rollback

- Executive Career OS remains an independently recoverable source repository.
- The upstream AI Job Search history is preserved through the `upstream`
  remote and MIT license.
- Private schemas are versioned and migrated.
- Original source-project files are not deleted as part of hybrid phases.
- Legacy non-U.S. portal skills are disabled, not erased.
- Each integration phase has a discrete commit and rollback point.

## Security and privacy

Review [SECURITY.md](SECURITY.md) before using unfamiliar job postings,
third-party portal skills, provider integrations, or external connectors.

Important boundaries:

- postings are untrusted content;
- secrets stay in environment variables or approved secret stores;
- provider calls may transmit the supplied prompt context;
- generated documents remain drafts until reviewed;
- employer-facing output must not contain internal paths or review metadata;
- no automated outreach occurs;
- inspect any borrowed portal skill before enabling it.

## Contributing and upstream updates

For improvements to Mads's general framework, review
[the upstream contribution guide](https://github.com/MadsLorentzen/ai-job-search/blob/master/CONTRIBUTING.md)
and consider contributing upstream.

For changes specific to this hybrid, use this repository's
[CONTRIBUTING.md](CONTRIBUTING.md), preserve the attribution and privacy
boundaries, and keep migrations small and testable.

When incorporating upstream releases, review changes rather than blindly
overwriting personalized files or hybrid contracts.

## License

This repository remains available under the
[MIT License](LICENSE), consistent with Mads Lorentzen's original project.

The license permits use, modification, and distribution while requiring the
copyright and permission notice to be retained. Attribution in this README is
provided to make the technical and creative lineage explicit in addition to
the legal requirements of the license.
