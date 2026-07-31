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

During Phase 2 the web shell uses validated neutral fixtures only. It does not
read or write personal career data, call an AI provider, or execute job-search
tools.

### Read-only Executive Career OS preview

Copy `apps/web/.env.example` to `apps/web/.env.local` and set:

```text
EXECUTIVE_CAREER_OS_PATH=C:\absolute\path\to\executive-career-os
```

Then open `/career/import-review`. The server reads only the 12 relative paths
in `src/server/evidence/source-manifest.ts`. Phase 3 exposes no save operation,
mutation endpoint, arbitrary-path input, AI call, or job-tool execution.

In Phase 4, explicit review decisions are written under the gitignored
`career-data/` directory. Tests use temporary directories and never touch the
live canonical record. The generated compatibility views and manifest must pass
hash/revision verification whenever the review page loads.

Phase 5 application workflow tests also use temporary archives. To exercise the
live workflow, confirm at least one employer-facing evidence item at
`/career/import-review`, then open `/applications/new`. Live application
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
