# Pro Flow Career OS setup

This is the quick-start guide for the **0.2 local-first public beta**. The
complete workflow, customization, privacy, backup, and troubleshooting guide is
in [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

> **Do not deploy this beta to a public URL.** It has no login system or
> multi-user data isolation and stores sensitive career data on the local
> filesystem. Run it only on a trusted computer at `localhost`.

## Requirements

- Git
- Node.js 22+
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
5. Complete the initial factual review once. Later editorial regenerations
   retain that approval.
6. Optionally generate AI emphasis suggestions, select a blend, and run the
   coordinated final-polish pass using the newest matching company insights.
7. Choose a theme and accent color, then select **Regenerate all files for this
   version** to save ATS and designed documents.
8. Complete mechanical and human visual review.
9. Continue through pipeline, Insights, Interview, and Archive.

Private records are written under the gitignored `career-data/` directory.
Back it up if you want to preserve your history. Never commit it.

Opening **Archive** initializes the embedded `career-data/vault.sqlite` index
and company-organized case folders automatically. No separate database server
or database installation is required.

## 6. Generate your local browser capture extension

1. Open **Browser Extension** at the bottom of Pro Flow's left toolbar.
2. Keep the local service URL as `http://localhost:3000`, or enter the
   localhost port used by your fork.
3. Give the extension a name and download its ZIP.
4. Extract the ZIP to a permanent local folder.
5. Open `chrome://extensions` or `edge://extensions` and enable Developer mode.
6. Select **Load unpacked** and choose the extracted folder.
7. Pin the extension and keep Pro Flow running on the configured local port.
8. Open one individual supported job posting—not a search-results page—and
   click the pinned extension once. An `OK` badge confirms capture, Pro Flow
   opens the saved-job workspace, and the left-toolbar status turns green.

The generator accepts localhost addresses only. It does not publish an
extension or configure a hosted service.

See [browser-extension/README.md](browser-extension/README.md) for its privacy
and permission model.

## 7. Connect Gmail for one-click drafts (optional)

Pro Flow can create complete Gmail drafts without sending them. Open **Gmail**
at the bottom of the left toolbar and follow the guided setup. Each local user
creates their own Google Cloud OAuth credential:

1. Enable the Gmail API in a Google Cloud project.
2. Configure the OAuth consent screen. For a personal local installation, keep
   the app in testing and add your Gmail address as a test user.
3. Create a **Web application** OAuth client.
4. Add `http://localhost:3000/api/integrations/gmail/callback` as an authorized
   redirect URI. If Pro Flow uses another port, use that port instead.
5. Paste the client ID and client secret into Pro Flow's Gmail setup page, save,
   and select **Connect Gmail**.

The client configuration and encrypted refresh token are stored only under the
gitignored `career-data/` directory. Pro Flow requests the narrow
`gmail.compose` permission, creates drafts for review, and never automatically
sends them. Remove the local authorization with **Disconnect Gmail**.

After connection, test both draft workflows:

- generate current résumé and cover-letter files, enter or paste a recipient
  in Application Studio, and create a Gmail draft with both PDFs attached;
- create an interview pack, choose **Create Gmail draft** under **Use this
  brief on your phone**, review it, and send it to yourself for the call.

The complete instructions and non-Gmail fallbacks are in the
[user guide](docs/USER_GUIDE.md#email-the-interview-brief-to-yourself-for-a-phone-interview).

## 8. Validate

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
