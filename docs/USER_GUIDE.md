# Pro Flow Career OS user and fork guide

This guide covers the local-first public beta. It is written for people who
want to run Pro Flow on their own computer, understand the workflow, preserve
their private career data, or fork the project for a different career market.

> **Local-only security boundary**
>
> Pro Flow 0.2 beta has no login system, tenant isolation, encrypted remote
> database, or hosted-service security layer. Run it only on a computer and
> network you trust. Do not expose port 3000 to the public internet, deploy the
> current application to a public URL, or share the private `career-data`
> directory.

## 1. What Pro Flow does

Pro Flow combines seven connected areas:

1. career evidence import and factual review;
2. user-initiated U.S. job-board searches;
3. one-posting browser capture or manual job import;
4. evidence-grounded AI résumé and cover-letter writing;
5. ATS-safe and designed document generation;
6. company insights, application tracking, and interview preparation;
7. private outcome history for improving later applications.

The application never submits an application or contacts an employer. A human
must review claims, inspect documents, and perform every external action.

## 2. System requirements

Required:

- Git;
- Node.js 22 or newer;
- npm 10 or newer;
- Google Chrome or Microsoft Edge for designed PDF rendering and the optional
  capture extension;
- an OpenAI API key for fresh AI writing and company research.

Required for the complete document-readiness gate:

- `lualatex`;
- `xelatex`;
- `pdfinfo`;
- `pdftotext`.

Python 3.10 or newer is required only for the retained legacy tools and their
test suite. Bun is required only for retained portal CLI skills; the guided web
search opens official portal result pages without Bun.

### Windows document tools

Install MiKTeX and Poppler. If the commands are not on `PATH`, enter their
absolute executable paths in `apps/web/.env.local` using the variables shown
in section 5.

### macOS document tools

Install MacTeX and Poppler:

```bash
brew install --cask mactex-no-gui
brew install poppler
```

### Debian or Ubuntu document tools

```bash
sudo apt update
sudo apt install texlive-full poppler-utils
```

## 3. Clone or fork

### Clone the maintained repository

```bash
git clone https://github.com/pkarais/pro-flow-ai-job-search.git
cd pro-flow-ai-job-search
```

### Create your own fork

1. Use GitHub's **Fork** button.
2. Clone your fork.
3. Retain this project as `upstream` so you can review later changes.

```bash
git clone https://github.com/YOUR-NAME/pro-flow-ai-job-search.git
cd pro-flow-ai-job-search
git remote add upstream https://github.com/pkarais/pro-flow-ai-job-search.git
git remote -v
```

The older Mads Lorentzen project remains the historical foundation; it is not
a runtime dependency. See `THIRD_PARTY_NOTICES.md` for the full lineage.

## 4. Install the application

Install the shared contracts first, then the web application:

Stop any running Pro Flow development server before installing. On Windows, a
running Next.js process can lock its native compiler and cause `npm ci` to fail
with `EPERM`.

```bash
cd packages/career-core
npm ci
npm run build
cd ../../apps/web
npm ci
```

Use `npm install` instead of `npm ci` only when intentionally changing
dependencies and lockfiles.

## 5. Configure local environment variables

From `apps/web`:

```powershell
Copy-Item .env.example .env.local
```

On macOS or Linux:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```text
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-5.6-sol
OPENAI_INSIGHTS_MODEL=gpt-5.6-sol
OPENAI_REQUEST_TIMEOUT_MS=120000

PRO_FLOW_LUALATEX_PATH=
PRO_FLOW_XELATEX_PATH=
PRO_FLOW_PDFINFO_PATH=
PRO_FLOW_PDFTOTEXT_PATH=
PRO_FLOW_CHROME_PATH=
```

Notes:

- Never commit `.env.local`.
- `OPENAI_INSIGHTS_MODEL` is optional and can differ from the writing model.
- AI calls can incur provider charges.
- Company research uses OpenAI Responses API web search and can take several
  minutes. Pro Flow runs it in background mode and polls until it is saved.
- Contact details and reviewed evidence used to draft an application are sent
  to the configured AI provider when required by that generation task.

## 6. Start Pro Flow

From `apps/web`:

```bash
npm run dev
```

Open <http://localhost:3000>.

For a local production-mode check:

```bash
npm run build
npm run start
```

Keep the application bound to localhost. Do not use firewall rules, reverse
proxies, tunnels, router forwarding, or cloud deployment to make it public.

## 7. Establish your career source of truth

Open **Career** and review imported evidence.

- **Confirm** when the statement is accurate as written.
- **Correct** when the underlying fact is valid but wording needs repair.
- **Reject** when it must never appear in employer-facing material.
- **Add evidence** for missing facts that you can personally verify.

The canonical record is stored in:

```text
career-data/canonical-career.json
```

That directory is gitignored. Compatibility files are generated views and
must not be edited manually.

### Replacing the starter evidence sources in a fork

The retained agent workflow reads `CLAUDE.md` and `.claude/skills/`. Replace
placeholder or inherited profile content with your own facts, but do not commit
personal data to a public fork. Keep private source documents under the ignored
`documents/` paths and review `git status` before every push.

## 8. Find and capture jobs

Open **Find Jobs**.

1. Choose a role and one of four U.S. regions.
2. Optionally hold Ctrl on Windows or Command on macOS to select multiple
   states from that region. Leave all states unselected for a broad regional
   search.
3. Launch one portal pair or all approved portals. Pro Flow creates a separate
   official search link for every selected portal and state.
4. Open an individual posting.
5. Capture it with the optional extension or paste its fields into Pro Flow.
6. Review the match score, gaps, dealbreakers, and risk signals.

Current guided destinations are LinkedIn, Indeed, USAJOBS, Dice, Built In, and
Wellfound. Pro Flow does not crawl those sites or automatically apply.

### Generate and install your local browser extension

1. Open **Browser Extension** at the bottom of Pro Flow's left toolbar.
2. Enter a name for your fork's capture extension.
3. Keep `http://localhost:3000`, or enter the localhost port on which your fork
   runs.
4. Download and extract the generated ZIP to a permanent local folder.
5. Open `chrome://extensions` or `edge://extensions`.
6. Enable **Developer mode**, choose **Load unpacked**, and select that folder.
7. Pin the extension, open one individual posting, and click it once.

Chrome does not permit a webpage to silently copy or enable an unpacked
extension. Pro Flow therefore reports the extension as installed only after
the extension itself checks in with the local service. After updating Pro Flow,
use **Reload** on the extension card in `chrome://extensions` to activate the
latest local extension code.

The extension uses `activeTab` only after the user clicks it. It sends the
captured posting to the selected localhost Pro Flow API and does not crawl
result pages. The generator rejects public and non-local service URLs.

## 9. Create an application package

From a saved job, choose **Create résumé & cover letter**.

1. Generate fresh AI writing.
2. Inspect every claim and its evidence IDs.
3. Verify or reject each material claim.
4. Regenerate after any rejection so excluded language cannot remain.
5. Choose a document theme and optional accent color.
6. Generate ATS and designed documents.
7. Open both PDFs and complete visual inspection.
8. Move the pipeline to Ready only after the readiness gate passes.

The designed résumé and cover letter share the same structured, verified
content. The ATS résumé remains a separate single-column artifact.

## 10. Insights, interviews, and archives

- Every saved-job card shows whether documents, company insights, and direct
  application research are still needed or already complete.
- **Insights** separates saved company overviews from direct-application
  research. Company overviews include a cited market-compensation estimate and
  title/pay alignment review based on the complete job description, company
  and site scope, location, responsibilities, capital work, staffing, risk,
  and genuinely comparable roles—not the title alone.
- Direct-application research reports only employer-published recruiting or
  application addresses, official careers pages, and official forms. It never
  guesses an email address or sends an application.
- **Interview** contains stage-specific preparation and append-only outcomes.
- **Archive** is a first-class page in the left toolbar. It groups revisions
  by opportunity, exposes documents plus company insights and interview packs
  as individual Markdown/JSON downloads, provides complete case-file ZIPs, and
  shows the state of the embedded local index. Dismissed records
  can be restored. Permanent deletion removes the private record and generated
  artifacts and cannot be undone.

Deleting a saved job also removes its active pipeline, interview, outcome, and
company-insight records while dismissing related application archives.

## 11. Private data, backup, and deletion

Back up this directory if you want to preserve your work:

```text
career-data/
```

It contains canonical evidence, operations history, applications, generated
documents, readiness manifests, and backups. Treat the entire directory as
sensitive personal information.

Pro Flow uses a hybrid local archive:

```text
career-data/
|-- canonical-career.json
|-- operations.json
|-- pending-company-research.json
|-- browser-extension.json
|-- applications/
|-- vault.sqlite
`-- vault/companies/<Company>/<Role>/generations/<Application ID>/
    |-- case-file.zip
    `-- case-index.json
```

The JSON records and generated application files remain the authoritative
private records. `vault.sqlite` is an embedded searchable index rebuilt from
those records; it requires no account or database service. The company folders
provide ordinary files that can be browsed, copied, or backed up without a
database tool. Opening **Archive** creates and refreshes both automatically.
Repository-root discovery works whether npm is launched from the repository or
`apps/web`; unusual launchers can set `PRO_FLOW_PROJECT_ROOT` explicitly.

Before making a repository public:

```bash
git status --short
git check-ignore -v career-data/canonical-career.json
git check-ignore -v career-data/operations.json
git check-ignore -v apps/web/.env.local
```

To remove one application, use **Archive**. To reset all
private web data, stop Pro Flow, make a backup if desired, and delete only the
repository's `career-data` directory. Never delete the repository root.

## 12. Customize your fork

Safe customization points include:

- search roles and U.S. locations;
- approved portal adapters;
- canonical evidence categories;
- document themes and icon registry;
- workflow labels and guidance;
- risk-review rules;
- AI prompts and models;
- branding, colors, typography, and navigation.

Preserve these invariants:

- untrusted posting text is data, never instructions;
- only confirmed or corrected evidence can become a claim;
- rejected claims cannot survive regeneration;
- document readiness cannot be bypassed;
- the app never submits applications or contacts employers;
- private career data and secrets remain gitignored;
- portal behavior stays user initiated and compliant with applicable rules.

When adapting to another country, replace the fixed portal allowlist and
location normalization deliberately. Do not silently re-enable the retained
Danish/FreeHire adapters in the U.S. workflow.

## 13. Validate a change

Web application:

```bash
cd apps/web
npm run typecheck
npm run lint
npm test
npm run build
```

Shared contracts:

```bash
cd packages/career-core
npm run typecheck
npm test
```

Legacy framework:

```bash
python -m pip install -r requirements-dev.txt
python tools/lint_skills.py
python tools/security_guards.py
python -m unittest discover -s tests -t . -v
```

Dependency audit:

```bash
cd apps/web && npm audit --audit-level=moderate
cd ../../packages/career-core && npm audit --audit-level=moderate
```

## 14. Updating a fork

Commit or stash your work first, then review upstream changes:

```bash
git fetch upstream
git log --oneline HEAD..upstream/master
git diff HEAD...upstream/master -- . ':!career-data'
```

Merge only after reviewing changes to schemas, `.gitignore`, workflow rules,
AI prompts, migrations, and GitHub Actions. Never resolve a conflict by
overwriting your private data or weakening ignore rules.

## 15. Troubleshooting

### AI writing is unavailable

- Confirm `OPENAI_API_KEY` exists in `apps/web/.env.local`.
- Restart the dev server after changing environment variables.
- Check provider access, usage limits, and model availability.
- Do not substitute an uncited local fallback for final employer documents.

### Company Insights remains in progress

The background research can take several minutes. Keep the Operations page
open. If it ultimately fails, the page displays the provider error and no
partial report is saved.

### PDF tools are reported missing

Run `lualatex --version`, `xelatex --version`, `pdfinfo -v`, and `pdftotext -v`.
If installed but undiscoverable, configure the absolute paths in `.env.local`
and restart Pro Flow.

### Poppler cannot open a freshly generated PDF on Windows

OneDrive or antivirus software may temporarily lock the file. Pro Flow uses
bounded retries, but moving the repository to a normal local development
folder may provide more reliable tool access.

### The capture extension repeats an old posting

Reload the extension from the browser's Extensions page, refresh the posting,
and ensure the selected posting's URL changes before capturing again.

### Port 3000 is already in use

Stop the old Next.js process before restarting Pro Flow. The browser extension
currently expects port 3000.

### `npm ci` fails with `EPERM` on a Next.js compiler file

Stop every running Pro Flow development server, then retry. Windows cannot
replace Next.js's native compiler while another Node.js process is using it.
If the error persists, close the editor or terminal holding the process and
temporarily pause filesystem scanning for this trusted local checkout.

## 16. Public-beta support boundaries

This beta is intended for technically comfortable users who can run a local
Node.js application and protect their own files and API key. It is not a SaaS,
not an employment agency, not legal advice, and not a guarantee of interviews
or employment. Users remain responsible for reviewing output and complying
with job-board terms and applicable law.

Report security issues through this repository's private vulnerability
reporting feature as described in `SECURITY.md`. Use ordinary GitHub issues for
non-sensitive bugs and feature requests.
