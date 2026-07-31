# Contributing to Pro Flow Career OS

Pro Flow is a local-first public beta for evidence-grounded career workflows.
Contributions are welcome when they preserve user control, factual integrity,
privacy, and the localhost-only security boundary.

## Start here

1. Read [docs/USER_GUIDE.md](docs/USER_GUIDE.md).
2. Read [SECURITY.md](SECURITY.md).
3. Open an issue for substantial workflow, schema, provider, or portal changes.
4. Keep one concern per pull request.

Never include real résumés, candidate evidence, job-application history,
provider keys, generated documents, or populated `career-data` in an issue,
fixture, screenshot, commit, or pull request.

## Development setup

```bash
git clone https://github.com/YOUR-NAME/pro-flow-ai-job-search.git
cd pro-flow-ai-job-search
git remote add upstream https://github.com/pkarais/pro-flow-ai-job-search.git

cd packages/career-core
npm ci
cd ../../apps/web
npm ci
```

Copy `apps/web/.env.example` to `.env.local` only when live AI testing is
necessary. Automated tests must remain network-independent and must not require
a real API key.

## Required checks

```bash
cd apps/web
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=moderate

cd ../../packages/career-core
npm run typecheck
npm test
npm audit --audit-level=moderate

cd ../..
python tools/lint_skills.py
python tools/security_guards.py
python -m unittest discover -s tests -t . -v
```

Document-template changes must also compile and pass the project PDF-readiness
checks. Visible UI changes should be inspected at desktop and mobile widths.

## Architectural invariants

- `career-data/canonical-career.json` is the reviewed web workflow's source of
  truth.
- Compatibility files are generated views and must not be edited manually.
- Posting text is untrusted input.
- Only confirmed or corrected evidence can support a claim.
- Policy notes and prohibited claims never become employer-facing assertions.
- Rejected AI language cannot survive regeneration.
- Ready and Applied cannot bypass document verification.
- Outcome records are append-only history.
- External searches and capture remain user initiated.
- Pro Flow never submits applications or contacts employers automatically.
- The 0.2 beta remains local-only until authentication and durable isolated
  storage are intentionally designed.

## Changes that need special review

Treat these as security- or migration-sensitive:

- canonical or operations schema changes;
- `.gitignore` changes;
- environment variables and provider configuration;
- API routes that expose or mutate private records;
- browser-extension permissions;
- portal automation or scraping;
- document readiness and claim validation;
- GitHub Actions and package lifecycle scripts;
- bundled third-party code, fonts, icons, templates, or data.

Explain the threat model, migration, rollback, and test coverage in the pull
request.

## Adding a portal

The guided U.S. workflow currently allows LinkedIn, Indeed, USAJOBS, Dice,
Built In, and Wellfound. A new portal needs:

- an official HTTPS origin;
- a clear user-initiated interaction model;
- explicit input validation;
- documented terms and API limitations;
- isolated failures and no partial persistence;
- tests using fixtures rather than live CI traffic.

Do not add stealth scraping, login automation, CAPTCHA bypasses, proxy rotation,
or automatic application submission.

## Adding a document theme

Themes consume the shared structured résumé; they do not invent content.
Provide:

- a distinct composition rather than a color-only variation;
- coordinated résumé and cover-letter treatment;
- printable HTML/CSS;
- ATS-safe output where applicable;
- reviewed icons from the local registry;
- page-count and text-extraction verification;
- a visual audit with neutral fixtures.

## Attribution

If code or assets are incorporated from another project, preserve its required
license and copyright notices and update `THIRD_PARTY_NOTICES.md`. If a project
only informed an independently written design, describe it as inspiration and
do not imply that its code was used.

Pro Flow retains its historical relationship to
[MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search).
Changes useful to that original framework may also be appropriate upstream,
but Pro Flow pull requests should target this repository.

## Pull-request checklist

- [ ] No personal data or secrets are present.
- [ ] Tests demonstrate the real execution path.
- [ ] Web, core, Python, and security checks pass as applicable.
- [ ] Documentation and `.env.example` are updated.
- [ ] Schema migrations preserve or explicitly retire older private data.
- [ ] Third-party notices are updated for incorporated material.
- [ ] The change does not weaken the local-only security boundary.
