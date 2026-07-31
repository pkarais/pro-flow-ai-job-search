# Development checks

## Python

The Pro-Flow test suite uses Python's built-in `unittest` runner. `pytest` is
not required.

Install the development dependency:

```powershell
python -m pip install -r requirements-dev.txt
```

Run the complete Python suite:

```powershell
python -m unittest discover -s tests -v
```

## Shared career contracts

Install and verify the standalone shared package:

```powershell
Set-Location packages/career-core
npm install
npm test
npm run typecheck
```

The package contains schemas and service contracts only. It must not contain
real candidate data, secrets, provider credentials, or generated application
documents.

## Web shell

Install and verify the isolated Next.js application:

```powershell
Set-Location apps/web
npm install
npm run lint
npm test
npm run typecheck
npm run build
```

Tests use validated neutral fixtures and do not call the live AI provider.
The running application uses the server-only AI writer only when
`OPENAI_API_KEY` is configured; otherwise it uses deterministic fallbacks.

### Canonical career evidence

Pro Flow owns its private career record at
`career-data/canonical-career.json`. Open `/career/import-review` to review or
correct that record directly. No external repository path is required or
consulted at runtime.

In Phase 4, explicit review decisions are written under the gitignored
`career-data/` directory. Tests use temporary directories and never touch the
live canonical record. The generated compatibility views and manifest must pass
hash/revision verification whenever the review page loads.

Phase 5 application workflow tests also use temporary archives. To exercise the
live workflow, confirm at least one employer-facing evidence item at
`/career/import-review`, then open `/applications/new`. Manage private application
revisions at `/applications/archive`. Live application
archives remain ignored under `career-data/applications/`.

Phase 6 document verification requires these commands on `PATH`:

```powershell
lualatex --version
xelatex --version
pdfinfo -v
pdftotext -v
```

The current environment may run in fail-closed mode when they are absent.
Generated sources and readiness manifests still remain private under the
application archive; no readiness status can become `ready` until compilation,
page-count, ATS/contact/keyword, and human visual checks all pass.

### Operations, insights, and interview workspaces

Open `/operations` for search, saved jobs, risk review, company-research
generation, and pipeline workflows. Successful company research is persisted
and viewed at `/insights`; the Find Jobs page shows only a completion message.
Open `/interview` for grounded interview preparation and append-only outcome
feedback.
Portal search uses only the installed CLIs under `.agents/skills` and requires:

```powershell
bun --version
```

When Bun is unavailable, search reports a scoped runtime error and does not
write partial results. Pipeline, insight, interview, and outcome features
remain available for existing application archives. All operational state is
private and gitignored at `career-data/operations.json`.

The current U.S.-only web search does not require Bun or portal-local
dependencies. Open `/api/operations/health` or use **Recheck adapters** in
`/operations` to verify the fixed official destinations. The allowlist is
LinkedIn, Indeed, USAJOBS, Dice, Built In, and Wellfound. Legacy FreeHire and
Danish skills have `enabled: false` so `/scrape` skips them.
