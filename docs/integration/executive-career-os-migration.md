# Executive Career OS Integration Manifest

## Purpose

This manifest controls the migration of reusable parts of
`C:\Users\pjkar\executive-career-os` into Pro-Flow AI Job Search.

The integration must produce one guided product without breaking either source
project, duplicating authoritative career facts, exposing private data, or
coupling the web interface to arbitrary shell commands.

## Protected baselines

| Project | Branch | Protected commit | Baseline state |
|---|---|---|---|
| Executive Career OS | `master` | `4afde6d` | Clean; 12 tests and TypeScript typecheck passed |
| Pro-Flow AI Job Search | `feature-pro-flow-career-os` | `9bf9a65` | Clean; Python source compilation passed |

Pro-Flow's Python suite uses the standard-library `unittest` runner rather than
requiring `pytest`. The complete baseline passes with 132 tests. Development
commands and the PyYAML lint dependency are documented in
`docs/development.md`.

## Integration rules

1. Pro-Flow is the destination repository. Executive Career OS remains an
   independently recoverable source project.
2. Do not merge Git histories or copy `.git`, `.env`, `.env.local`,
   `node_modules`, `.next`, generated output, or TypeScript build metadata.
3. Migrate in small, testable slices. Existing Pro-Flow commands remain
   operational until their UI-backed replacements pass equivalent checks.
4. The browser never receives provider keys, arbitrary filesystem access, or
   arbitrary command execution.
5. Career facts have one authoritative representation. Compatibility Markdown
   is generated from that record rather than maintained independently.
6. Imported facts retain source provenance, verification state, conflicts, and
   usage restrictions.
7. Employer-facing documents never expose internal source paths or review
   metadata.
8. Unsupported requirements remain gaps or review items. They never become
   résumé or cover-letter claims.
9. The application remains local-first until authentication, remote storage,
   access control, and privacy requirements are deliberately implemented.
10. Each phase has a completion gate and rollback point.

## Proposed target structure

```text
pro-flow-ai-job-search/
├── apps/
│   └── web/                         # Guided Next.js interface
├── packages/
│   └── career-core/                 # Shared schemas and domain logic
├── career-data/                     # Private canonical user data (gitignored)
├── docs/
│   └── integration/                 # Migration records and decisions
├── .agents/skills/                  # Existing portal adapters/CLIs
├── .claude/                         # Existing methodology and compatibility
├── documents/                       # Private evidence and application archives
├── cv/                              # CV templates and generated artifacts
└── cover_letters/                   # Letter templates and generated artifacts
```

The target structure is provisional until the shared data contract is
implemented. Creating this manifest does not change Pro-Flow's current
single-source-of-truth rules.

## Integration seams

The projects connect through explicit contracts rather than direct knowledge of
one another's internal files.

| Seam | Responsibility | Initial implementation |
|---|---|---|
| Career profile provider | Load and save verified user facts | Filesystem adapter with schema validation |
| Evidence importer | Import source material with provenance | Read-only Executive Career OS Markdown importer |
| Workflow service | Coordinate guided stages and readiness gates | Typed service functions |
| AI provider | Generate structured, evidence-grounded results | Adapt OpenAI Responses API integration |
| Job source provider | Normalize portal results | Wrappers around existing `.agents/skills` CLIs |
| Artifact store | Persist jobs, reviews, documents, and outcomes | Pro-Flow application archive directories |
| Document engine | Render and compile CV/letter artifacts | Existing LaTeX templates and tools |
| Verification engine | Factual, layout, PDF, and ATS checks | Existing Pro-Flow checks plus deterministic rules |
| UI API | Expose safe operations to the browser | Validated server-only Next.js routes |

## Source component disposition

### Repository-level files

| Executive source | Purpose | Proposed destination | Treatment | Privacy | Verification |
|---|---|---|---|---|---|
| `AGENTS.md` | Next.js version warning | `apps/web/AGENTS.md` or root guidance section | Adapt | Public | Confirm installed Next.js documentation behavior |
| `CLAUDE.md` | Pointer to `AGENTS.md` | None initially | Retire | Public | Root Pro-Flow guidance remains authoritative |
| `README.md` | Executive app setup and limitations | `apps/web/README.md` | Rewrite | Public | Match hybrid scripts and data model |
| `package.json` | Web dependencies and scripts | `apps/web/package.json` | Adapt | Public | Install, test, typecheck, lint, build |
| `package-lock.json` | Dependency lock | `apps/web/package-lock.json` | Regenerate | Public | Clean install and audit |
| `.env.example` | Provider configuration example | `apps/web/.env.example` | Adapt | Public template | Must contain names/placeholders only |
| `.gitignore` | Web build and secret exclusions | Root `.gitignore` additions | Adapt | Public | `git check-ignore` assertions |
| Next/TS/PostCSS/ESLint configs | Web build configuration | `apps/web/` | Adapt | Public | Typecheck, lint, build |
| `public/*.svg` | Starter assets | None | Retire | Public | Not product-specific |
| `src/app/favicon.ico` | Starter icon | None or temporary web asset | Retire/replace | Public | Replace during product design |

### Application interface

| Executive source | Purpose | Proposed destination | Treatment | Privacy | Verification |
|---|---|---|---|---|---|
| `src/app/page.tsx` | Single-page application shell | `apps/web/src/app/page.tsx` | Rewrite | Public | Responsive and accessible UI review |
| `src/app/layout.tsx` | Root layout and metadata | `apps/web/src/app/layout.tsx` | Adapt | Public | Metadata, fonts, accessibility |
| `src/app/globals.css` | Existing visual system | `apps/web/src/app/globals.css` | Selectively reuse | Public | Design tokens and responsive checks |
| `src/components/application-form.tsx` | Opportunity entry form | Guided opportunity workflow | Adapt | Public | Client/server validation parity |
| `src/components/output-tabs.tsx` | Generated-output navigation | Application studio | Adapt | Public | Keyboard and screen-reader behavior |
| `src/components/output-panel.tsx` | Output display | Application studio | Adapt | Public | Long-content and error states |
| `src/components/factual-review-panel.tsx` | Claim decisions | Shared review workspace | Reuse then extend | Private data UI | Persistence and completeness checks |
| `src/components/copy-button.tsx` | Clipboard utility | Shared UI component | Reuse | Public | Success/failure feedback |
| `src/components/status-banner.tsx` | Local/provider status | System status component | Rewrite | Public | Must not reveal secrets |

### API and domain logic

| Executive source | Purpose | Proposed destination | Treatment | Privacy | Verification |
|---|---|---|---|---|---|
| `src/app/api/generate/route.ts` | OpenAI structured generation | `apps/web` API plus shared generation service | Adapt | Server-only | Route, schema, provider-failure tests |
| `src/lib/generation-schema.ts` | Input/output contracts | `packages/career-core/schemas` | Reuse and extend | Public code | Unit and compatibility tests |
| `src/lib/career-knowledge.ts` | Required-file loader | Evidence import adapter | Rewrite | Private inputs | Missing, empty, provenance, conflict tests |
| `src/lib/prompt-builder.ts` | Generation request builder | AI generation adapter | Rewrite | Private context | Prompt boundary and injection tests |
| `src/lib/quality-checks.ts` | Deterministic checks | Verification engine | Reuse and extend | Public code | Unit tests for every rule |
| `src/lib/markdown-export.ts` | Package export | Artifact/export service | Adapt | Private outputs | Snapshot and filename tests |

### Tests

| Executive source | Purpose | Proposed destination | Treatment | Verification |
|---|---|---|---|---|
| `tests/core.test.mjs` | Schema, loader, export, and quality tests | Tests alongside shared package and web API | Split and expand | Must remain green before source removal |

### Career knowledge

All files in this section contain personal or career evidence. They must not be
copied into a public/static web directory.

| Executive source | Canonical destination field | Treatment | Verification concerns |
|---|---|---|---|
| `career_os/knowledge/professional_genome.md` | Positioning and career narrative | Import for review | Separate positioning from factual claims |
| `career_os/knowledge/verified_career_history.md` | Employment history | Import for review | Preserve uncertain dates and employer-name conflict |
| `career_os/knowledge/biography.md` | Biography and interview narrative | Import for review | Do not automatically place in ATS résumé |
| `career_os/knowledge/skills.md` | Skills inventory | Import and normalize | Skills do not imply credentials or recency |
| `career_os/knowledge/education_credentials.md` | Education and credentials | Import for review | Preserve every `REQUIRES VERIFICATION` marker |
| `career_os/knowledge/approved_metrics.md` | Metrics evidence | Import with usage policy | Never convert estimates to personal hours or outcomes |
| `career_os/knowledge/voice_profile.md` | Writing voice | Import and reconcile | Merge with Pro-Flow writing rules |
| `career_os/knowledge/prohibited_claims.md` | Claim restrictions | Import as validation policy | Enforce in generation and review |

### Project evidence

| Executive source | Canonical destination field | Treatment | Verification concerns |
|---|---|---|---|
| `career_os/projects/shrine_ops.md` | Project portfolio | Import for review | Separate features, repository evidence, and business outcomes |
| `career_os/projects/hireflow_ai.md` | Project portfolio | Import for review | Do not imply recruitment outcomes |
| `career_os/projects/podcast_automation.md` | Project portfolio | Import cautiously | Exact functions remain unverified |
| `career_os/projects/sustainability_net_zero.md` | Project portfolio | Import for review | Do not claim implementation without evidence |

### Prompts and templates

| Executive source | Proposed destination | Treatment | Verification |
|---|---|---|---|
| `career_os/prompts/application_generator.md` | Shared generation policy | Reconcile with Pro-Flow `/apply` methodology | Conflict matrix and output tests |
| `career_os/templates/application_package.md` | Export template | Adapt | Snapshot tests and clean employer-facing sections |

## Pro-Flow component disposition

| Pro-Flow component | Hybrid role | Initial treatment |
|---|---|---|
| `.claude/commands/setup.md` | Onboarding methodology | Preserve; expose progressively through UI |
| `.claude/commands/scrape.md` or scraper skill | Search orchestration | Preserve; later wrap with normalized adapter |
| `.claude/commands/rank.md` | Explainable fit ranking | Preserve; later implement domain service |
| `.claude/commands/apply.md` | Application methodology and verification | Preserve as behavioral reference |
| `.claude/commands/interview.md` | Interview workflow | Preserve for later UI phase |
| `.claude/commands/outcome.md` | Pipeline outcomes and follow-up | Preserve for later UI phase |
| `.claude/skills/job-application-assistant/` | Career methodology | Preserve; later generate compatibility views where appropriate |
| `.agents/skills/*` | Live job-source implementations | Preserve unchanged; add adapters later |
| `cv/` | Master and tailored CV artifacts | Preserve |
| `cover_letters/` | Letter templates and artifacts | Preserve |
| `documents/applications/` | Application archive | Preserve and formalize |
| `tools/verify_pdf.py` | PDF verification | Preserve and expose through document service |
| `tools/security_guards.py` | Security validation | Preserve and incorporate into API/workflow gates |
| `salary_lookup.py` | Optional salary support | Preserve for later adapter |

## Data classification

| Class | Examples | Storage rule |
|---|---|---|
| Public code/configuration | Schemas, UI components, safe `.env.example` | May be tracked |
| Private profile | Contact information, employment history, preferences | Local private data; gitignored by default |
| Sensitive evidence | Diplomas, references, identification documents | Private `documents/`; never public/static |
| Secrets | API keys, OAuth tokens | Environment/secret store only |
| Generated application data | Job postings, drafts, review decisions, PDFs | Private application archive |
| Public artifacts | User-approved résumé/letter intended for submission | Export only after readiness gate |

## Migration phases and gates

### Phase 0: Protection

Status: **Complete**

- Executive Career OS checkpoint committed.
- Pro-Flow integration branch created.
- Both working trees clean.
- Secret/build exclusions verified.

Rollback: return Executive Career OS to `4afde6d` and Pro-Flow to `9bf9a65`.

### Phase 1: Documentation and contracts

Status: **Complete**

Completed:

- Created and validated this manifest.
- Established `python -m unittest discover -s tests -v` as the executable
  Pro-Flow test baseline.
- Added `requirements-dev.txt` and documented development checks.
- Created the standalone `packages/career-core` package.
- Defined evidence, profile, opportunity, fit, application, workflow, and
  readiness schemas.
- Defined provider, repository, generation, document, and job-source service
  interfaces.
- Added neutral contract fixtures and tests without importing personal data.

Gate result:

- 132 Pro-Flow Python tests pass.
- 8 career-core contract tests pass.
- career-core TypeScript typecheck passes.
- Security guards and skill linting pass.
- No personal data was copied into the package or tracked web assets.

The final canonical-data location and backup implementation remains gated for
Phase 4, after the read-only importer proves the required data shape.

### Phase 2: Isolated web shell

Status: **Complete**

Completed:

- Created the isolated Next.js App Router application in `apps/web`.
- Read and followed the documentation shipped with the installed Next.js 16
  framework before implementing the shell.
- Applied a tokenized visual system, reusable UI roles, accessible navigation,
  explicit loading/error/not-found states, responsive layouts, reduced-motion
  handling, and mobile safe-area behavior.
- Connected the shell to the built `@pro-flow/career-core` package.
- Added a documented Turbopack monorepo root so linked shared packages resolve
  through the supported framework mechanism.
- Added validated neutral fixtures and a fixture-only boundary test.
- Added independent lint, test, typecheck, and production-build commands.
- Patched the dependency tree through compatible version updates and scoped
  overrides; no automatic breaking audit downgrade was used.
- Performed local runtime and desktop/mobile visual inspection.

Gate result:

- 132 existing Pro-Flow Python tests pass.
- 8 career-core contract tests and typecheck pass.
- 5 web-shell tests, ESLint, typecheck, and production build pass.
- NPM audit reports zero known vulnerabilities for the web package.
- Security guards and skill linting pass.
- The shell returns HTTP 200 from the production server.
- No personal data, AI providers, portal tools, or filesystem writes are
  connected.
- The protected Executive Career OS repository remains independent.

### Phase 3: Read-only evidence import

Status: **Complete**

Completed:

- Added shared runtime schemas for source manifests, source summaries, imported
  facts, issues, and explicitly read-only preview results.
- Defined 12 allowlisted Executive Career OS evidence sources covering career
  knowledge and project evidence.
- Implemented a read-only Markdown importer with source-boundary enforcement.
- Preserved relative source path, source section, target profile path,
  verification requirements, conflicts, and claim-usage restrictions.
- Added missing, empty, unreadable, and path-escape handling.
- Added a server-only preview service configured through
  `EXECUTIVE_CAREER_OS_PATH`.
- Added guided configured, unconfigured, and connection-error UI states.
- Added an evidence review route with source coverage, attention queue,
  provenance, and read-only messaging.
- Added route-aware desktop/mobile navigation and workspace-mode labeling.
- Tested the importer against neutral temporary fixtures and the protected live
  Executive Career OS checkout.

Gate result:

- All 12 live sources load through the explicit allowlist.
- 74 live evidence items retain source provenance.
- 11 source-marked uncertainties remain verification items.
- Zero blocking live-source issues were found.
- Path traversal is rejected.
- Missing and empty sources become blocking preview issues.
- The result schema requires `readOnly: true`.
- No importer or UI mutation operation exists.
- The protected source repository remains unchanged.

### Phase 4: Canonical profile and guided review

Status: **Complete**

Completed:

- Added a strict version-one canonical career schema with preserved original
  evidence, decisions, corrections, provenance, and unique record IDs.
- Added safe migration from the prototype version zero and explicit rejection
  of unsupported future schema versions.
- Added a fixed private `career-data` storage boundary.
- Added atomic JSON replacement, optimistic revision checks, and a backup of
  every prior canonical revision.
- Added deterministic canonical-profile and evidence-ledger Markdown views.
- Added a compatibility manifest containing canonical revision and SHA-256
  hashes for both generated views.
- Added drift verification on review-page load and after every decision.
- Added a strict one-fact decision API with current-source matching.
- Added guided confirm, correct, and reject controls, progress/filter states,
  correction editing, rejection confirmation, retry/error feedback, and
  original-evidence disclosure.
- Updated `AGENTS.md` only after round-trip, deterministic-generation, and drift
  tests passed.

Gate result:

- Canonical JSON round-trips without data loss.
- Stale revisions are rejected.
- Prior revisions are backed up.
- Compatibility rendering is deterministic.
- Revision/hash verification detects missing, changed, or stale generated
  views.
- Pending and rejected facts are excluded from compatibility profile output.
- Corrected facts retain their original source value in the ledger.
- Writes remain impossible outside the fixed private data root.

### Phase 5: First vertical application workflow

Status: **Implementation complete; live acceptance pending**

Completed:

- Added validated manual opportunity intake; posting content remains untrusted
  data and is never treated as instructions.
- Added deterministic fit scoring against confirmed/corrected canonical
  evidence with visible matching terms, gaps, eligibility questions, and
  evidence IDs.
- Added a conservative structured positioning and cover-letter draft without
  introducing a provider dependency.
- Excluded policy-only voice and prohibited-claim records from employer-facing
  claims.
- Added explicit verify/do-not-use decisions for every drafted material claim.
- Added fixed private application archives with server-generated IDs, strict
  schemas, atomic writes, and optimistic revision checks.
- Added a responsive guided application studio spanning intake, assessment,
  draft inspection, factual review, and archive status.

Gate result:

- Neutral end-to-end fixture completes intake through archived factual review.
- An unreviewed canonical profile cannot generate a draft.
- Every draft claim carries canonical evidence IDs.
- Unsupported posting terms remain visible gaps.
- Policy records cannot become draft claims.
- Stale claim decisions are rejected.
- No employer submission, public artifact, source path, AI provider, or final
  document generation is exposed.
- Live acceptance with a user-selected real posting remains pending and will
  not be simulated without the user's review decisions.

Gate:

- Unsupported requirements never enter public documents.
- Employer-facing output contains no internal paths.
- A real posting completes end-to-end.

### Phase 6: Documents and readiness

Status: **Implementation complete; local tool acceptance pending**

Completed:

- Added validated structured contact input rather than inferring contact data
  from narrative evidence.
- Added deterministic, escaped two-page CV and one-page cover-letter LaTeX
  source rendering from verified claims only.
- Added fixed-command compilation through `lualatex` and `xelatex`.
- Added exact PDF page-count checks through `pdfinfo`.
- Added ATS text extraction, garbled-text detection, literal email/phone
  checks, and supported-keyword survival checks through `pdftotext`.
- Added private, allowlisted artifact viewing with no arbitrary path input.
- Added cleanup of compiler intermediates while preserving source, PDF, ATS
  text, and readiness records.
- Added a required human visual-review checkpoint after all mechanical checks
  pass.
- Added a strict readiness schema that rejects `ready` whenever any mandatory
  check is pending or failed.
- Added responsive readiness progress, artifact, blocked, and ready states.

Gate:

- Pro-Flow's mandatory PDF/ATS requirements remain intact.
- Pending, failed, stale, or visually unreviewed output blocks "Ready to
  Submit."
- Neutral tests prove rejected/pending claims cannot render and unavailable
  tools fail closed.
- The current host does not expose `lualatex`, `xelatex`, `pdfinfo`, or
  `pdftotext`; live PDF compilation and visual acceptance therefore remain
  pending rather than being reported as passed.

### Phase 7: Search, pipeline, interview, and outcomes

1. Wrap portal skills behind normalized adapters.
2. Add deduplication and ranking.
3. Add application state transitions.
4. Add interview preparation and outcome feedback.

Implementation:

- Added a single `/operations` workspace with inline guidance and next actions.
- Wrapped six existing portal CLIs behind fixed, normalized Bun adapters.
- Added evidence-aware ranking, cross-portal URL/content deduplication, and
  private revisioned storage.
- Added contract-validated pipeline transitions with a Phase 6 readiness gate.
- Added verified-claim interview packs and append-only outcome history.
- Kept portal failures isolated and prohibited automatic submission/outreach.

Gate:

- Portal failures are isolated.
- State transitions are validated.
- Submitted artifacts remain immutable historical evidence.
- Neutral automated tests, lint, type checking, and production build pass.
- Live portal acceptance remains pending until Bun is installed on the host.

### Phase 8: Live integration acceptance

1. Verify Bun and fixed CLI paths without running arbitrary commands.
2. Install ignored CLI-local dependencies for Bunli-based portals.
3. Use an explicit argument contract and result normalizer for every portal.
4. Surface local readiness separately from remote portal availability.
5. Exercise capped live searches without storing acceptance-test results.

Implementation:

- Bun 1.3.14 is installed and inherited by the local preview.
- All six local adapters report ready through `/api/operations/health`.
- FreeHire, LinkedIn, Jobdanmark, and Jobnet returned capped live results.
- Jobbank correctly reported its documented Cloudflare block as isolated.
- Jobindex reached its adapter but the upstream operation timed out.
- The guided workspace now displays runtime readiness and supports rechecks.
- Neutral tests cover portal-specific flags, result shapes, and missing-runtime
  behavior.

Gate:

- Local failures are actionable and do not write partial search state.
- Portal-specific fields normalize without fabricated company information.
- Remote blocks and timeouts are reported honestly rather than labeled as
  local setup failures.
- Web tests, lint, type checking, and production compilation pass.

### Phase 9: U.S.-only guided search

1. Replace the mixed-market portal enum with a U.S.-origin allowlist.
2. Use official search destinations where no public candidate-search API
   exists.
3. Populate role/title suggestions from reviewed career evidence, connected
   import evidence, and archived user selections.
4. Prefill a reviewed U.S. location or fall back to `United States`.
5. Remove legacy non-U.S. results without changing application history.

Implementation:

- The only active choices are LinkedIn, Indeed, USAJOBS, Dice, Built In, and
  Wellfound.
- The guided form opens a validated, prefilled official search in a new tab.
- Indeed is not scraped; its documented APIs are partner/employer oriented.
- USAJOBS uses its official public search page until approved API credentials
  are configured.
- FreeHire and the four Danish skills are disabled so `/scrape` skips them.
- Operations schema v3 filters legacy non-U.S. jobs while preserving pipeline,
  interview, and outcome records, and retains the latest 50 private search
  selections.
- Role uses a complete dropdown plus custom entry; location uses an editable
  suggestion list, retaining manual choice.
- Portal selection is grouped into three pairs plus an all-six option, with
  concurrent tab launch and explicit popup-blocked fallback links.

Gate:

- Every generated redirect resolves to one of six fixed official HTTPS hosts.
- Each pair returns exactly two unique destinations and `all` returns six.
- No Danish or non-U.S. portal ID passes the shared contract.
- Search defaults contain only reviewed/imported/user-selected role inputs and
  U.S. locations.
- Migration tests prove application workflow history is preserved.
- Successful user-selected roles and normalized U.S. locations are prioritized
  on the next visit without becoming verified career facts.

### Phase 10: Guided end-to-end acceptance

1. Replace the original fixture-only home dashboard with live, read-only
   workflow progress.
2. Derive milestones from the canonical profile, grouped search history,
   application archives, current document manifests, pipeline records,
   interview packs, and outcomes.
3. Recommend the first incomplete action while continuing to show later work
   that already exists.
4. Keep every write behind its existing dedicated workflow and safety gate.

Implementation:

- The home route loads one fail-safe acceptance snapshot from the fixed,
  gitignored `career-data` root.
- Eight milestones cover evidence, search, application creation, factual claim
  review, document verification, pipeline tracking, interview preparation, and
  outcome recording.
- Empty evidence is never treated as complete.
- Document readiness counts only when a ready manifest matches the current
  application revision.
- Read failures produce an actionable warning and a zero-state plan; they do
  not mutate or repair private data automatically.
- Fixture statistics and the stale Phase 2 data-boundary message are removed
  from the active dashboard.

Gate:

- Exactly one first-incomplete milestone is recommended when work remains.
- A complete persisted workflow reports all eight milestones complete.
- Later work never bypasses or conceals an earlier incomplete milestone.
- The dashboard cannot approve evidence, generate applications, transition the
  pipeline, contact an employer, or submit an application.
- Web tests, lint, type checking, and production compilation pass.

## Immediate conflicts to resolve

| Topic | Executive behavior | Pro-Flow behavior | Resolution |
|---|---|---|---|
| Source of truth | `career_os` Markdown corpus | Three-source union in profile/CV/`CLAUDE.md` | Introduce one structured canonical record, then generate compatibility views |
| Application output | Markdown package | LaTeX CV and cover letter plus PDFs | Use structured package internally; render through Pro-Flow document engine |
| Grounding | Source file per material claim | Audit against profile union | Preserve claim provenance and validate against canonical evidence |
| Workflow execution | Next.js API route | Agent commands/methodology | Extract stable domain services; keep commands as compatibility workflow |
| Target roles | Hard-coded executive role enum | User-configured search profile | Store user-approved role families and allow controlled additions |
| Review state | In-memory client decisions/download | Filesystem application archives | Persist decisions under stable application IDs |
| AI provider | Direct OpenAI Responses API | Agent-runtime driven | Use provider adapter; do not bind core domain logic to one model |

## Testing requirements

Before behavior is migrated, the combined project needs:

- Pro-Flow Python test dependencies and a repeatable test command.
- Shared schema tests.
- Import provenance and conflict tests.
- Path traversal and filename sanitization tests.
- Prompt-injection boundary tests for job descriptions.
- Employer-facing source-redaction tests.
- Atomic write and backup tests.
- API validation and provider-error tests.
- Workflow-state transition tests.
- Document compilation and ATS extraction tests.
- A fixture profile containing no real personal data for automated tests.

## Rollback strategy

1. Keep integration work on `feature-pro-flow-career-os`.
2. Commit at the end of each completed phase.
3. Do not delete source-project files as part of migration commits.
4. Keep data migrations idempotent and versioned.
5. Back up private canonical data before schema upgrades.
6. Keep generated compatibility views reproducible from canonical data.
7. If a phase fails its gate, revert only that phase's integration commit.

## Definition of seamless integration

The integration is considered seamless when:

1. A user completes one guided onboarding process.
2. Confirmed facts are stored once and reused everywhere.
3. Search, fit evaluation, drafting, review, document verification,
   application tracking, interviews, and outcomes share stable application IDs.
4. The interface always shows the next appropriate action.
5. Technical commands, provider details, and filesystem conventions remain
   hidden during normal use.
6. Every employer-facing claim is supportable.
7. Existing Pro-Flow safety and document-quality requirements are preserved.
8. Both original project baselines remain recoverable.

## Next action

Choose a role and U.S. location in `/operations`, run each desired official
search, and paste a selected posting into the Application Studio. Then complete
the Phase 5/6 document acceptance gate and verify the pipeline, interview, and
outcome journey.
