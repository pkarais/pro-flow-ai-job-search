# Pro Flow Career OS web application

Release: `0.2.0-beta.1` local-first public beta.

This Next.js application is the guided interface and local API for Pro Flow.
It has no authentication or tenant isolation. Run it only on a trusted computer
at `http://localhost:3000`; do not deploy this beta to a public URL.

Start with the repository [setup guide](../../SETUP.md) and the
[complete user guide](../../docs/USER_GUIDE.md).

## Product surfaces

| Route | Responsibility |
|---|---|
| `/` | Workflow progress and local acceptance status |
| `/career/import-review` | Canonical evidence review and correction |
| `/operations` | U.S. job discovery, saved jobs, research launch, and pipeline |
| `/applications/new` | Evidence-grounded writing, refinement, themes, previews, exports, and application email drafts |
| `/insights` | Saved company, compensation, scope, and direct-application research |
| `/interview` | Stage-specific interview packs, phone-reference delivery, and outcomes |
| `/applications/archive` | Application generations, artifacts, research, interview packs, and ZIP case files |
| `/extension` | Local Chrome/Edge capture-extension builder and installation status |
| `/gmail` | Optional Gmail OAuth configuration and draft-only connection |

## Trust boundaries

- `../../packages/career-core` owns shared schemas and workflow contracts.
- `../../career-data/` owns private runtime data and is gitignored.
- Job postings are untrusted input, never agent instructions.
- Only confirmed or corrected employer-facing evidence can support a candidate
  claim.
- Company insights may change emphasis but cannot become candidate evidence.
- OpenAI calls are server-only, use structured output where applicable, and
  use `store: false` for grounded writing.
- Gmail uses `gmail.compose` and creates drafts only; Pro Flow never sends.
- Browser capture is a single explicit action on the active posting; the
  server never fetches or crawls a job board.
- Artifact access uses validated application IDs and fixed filenames.
- Ready and Applied states remain gated by current document readiness.

## Writing and document pipeline

The application studio combines the complete posting, reviewed evidence,
current structured content, voice constraints, selected emphasis directions,
and the newest matching company-overview report. The AI rewrites the summary,
résumé bullets, and cover letter as one coordinated package with evidence IDs.
Unknown evidence, policy leakage, and unsupported claims fail closed.

The same verified structured résumé feeds:

- a conservative ATS LaTeX/PDF path;
- modern HTML/CSS live preview;
- designed résumé and cover-letter PDFs;
- editable DOCX exports;
- theme and palette variations; and
- downloadable application email packages.

The readiness gate checks compilation, expected page counts, extractable text,
literal contact information, supported keywords, current revision, and human
visual inspection. Email drafts may use generated current files while quality
warnings remain visible; those warnings are not silently converted to passes.

## Research, archive, and interview behavior

Company research is stored separately as a cited company overview or verified
direct-application report. Compensation analysis considers the complete job
scope, company/site context, geography, comparable role families, and source
year—not the title alone.

Archive maintains authoritative JSON/application files, a rebuildable embedded
SQLite index, company/role/generation folders, individual artifacts, and a ZIP
case file containing available documents, research, interview preparation,
pipeline, outcomes, and manifests.

Interview packs use verified claims plus relevant insights to generate likely
questions, honest bridge answers, questions to ask, and talking points. Users
can create a complete Gmail draft addressed to themselves, open supported web
compose links, copy/download the brief, or use an offline `.eml` fallback.

## Search and extension behavior

The guided search opens validated official HTTPS searches on LinkedIn, Indeed,
USAJOBS, Dice, Built In, and Wellfound. It supports four U.S. regions and
Ctrl/Command multi-state selection. The current guided flow does not require
Bun and does not ingest portal result pages automatically.

The unpacked extension reads Schema.org `JobPosting` data first and then
visible-page fields. It posts one normalized record to localhost after the user
clicks the extension. Its status turns green only after the installed extension
checks in with this running Pro Flow instance.

## Commands

```powershell
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run audit:themes -- <application-id> [output-directory]
npm run build
```

`audit:themes` is a per-application visual audit and therefore requires an ID
from the private Archive. It is not a zero-argument CI check.

Set provider and local tool paths in `.env.local` using the template in
`.env.example`. Never commit `.env.local`, `career-data`, OAuth configuration,
tokens, source documents, or generated application artifacts.
