# Pro Flow Career OS setup

This is the quick-start guide for the **0.2 local-first public beta**. The
complete workflow, customization, privacy, backup, and troubleshooting guide is
in [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

> **Do not deploy this beta to a public URL.** It has no login system or
> multi-user data isolation and stores sensitive career data on the local
> filesystem. Run it only on a trusted computer at `localhost`.

## Requirements

- Git
- Node.js 20+
- npm 10+
- Chrome or Edge
- OpenAI API key
- For final PDF readiness: `lualatex`, `xelatex`, `pdfinfo`, and `pdftotext`
- Optional for retained legacy tools: Python 3.10+ and Bun

## 1. Clone

```bash
git clone https://github.com/pkarais/pro-flow-ai-job-search.git
cd pro-flow-ai-job-search
```

If this is your fork, replace `pkarais` with your GitHub account and retain the
maintained project as upstream:

```bash
git remote add upstream https://github.com/pkarais/pro-flow-ai-job-search.git
```

## 2. Install

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

## 3. Configure

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS or Linux:

```bash
cp .env.example .env.local
```

Edit `apps/web/.env.local`:

```text
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-5.6-sol
OPENAI_INSIGHTS_MODEL=gpt-5.6-sol
OPENAI_REQUEST_TIMEOUT_MS=120000
```

Leave the `PRO_FLOW_*_PATH` values empty when the document commands are already
on `PATH`. Otherwise provide their absolute executable paths.

## 4. Start

From `apps/web`:

```bash
npm run dev
```

Open <http://localhost:3000>.

## 5. First-use sequence

1. Open **Career** and establish reviewed canonical evidence.
2. Open **Find Jobs** and launch a user-initiated portal search.
3. Save or capture one posting.
4. Create fresh AI résumé and cover-letter writing.
5. Review every material claim.
6. Generate ATS and designed documents.
7. Complete mechanical and human visual review.
8. Continue through pipeline, Insights, and Interview.

Private records are written under the gitignored `career-data/` directory.
Back it up if you want to preserve your history. Never commit it.

## 6. Optional browser capture

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked**.
4. Choose this repository's `browser-extension` directory.
5. Pin the extension and keep Pro Flow running on port 3000.

See [browser-extension/README.md](browser-extension/README.md) for its privacy
and permission model.

## 7. Validate

```bash
cd apps/web
npm run typecheck
npm run lint
npm test
npm run build

cd ../../packages/career-core
npm run typecheck
npm test

cd ../..
python tools/lint_skills.py
python tools/security_guards.py
python -m unittest discover -s tests -t . -v
```

## Help and customization

- Full guide: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- Architecture and development: [docs/development.md](docs/development.md)
- Security boundary: [SECURITY.md](SECURITY.md)
- Contributions and forks: [CONTRIBUTING.md](CONTRIBUTING.md)
- Attribution and licenses: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
