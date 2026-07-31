# Local-first public beta release checklist

Use this checklist before tagging or announcing a Pro Flow beta. A release is
a commit on `master` that has passed GitHub Actions and contains no private
career data.

## Repository safety

- [ ] `git status --short` is empty.
- [ ] `.env.local`, `career-data`, generated documents, screenshots with
      personal details, and source documents are not tracked.
- [ ] Git history has been reviewed for accidentally committed secrets and
      personal information.
- [ ] GitHub secret scanning and dependency graph are enabled.
- [ ] Branch protection requires the CI workflow and pull-request review.
- [ ] Private vulnerability reporting is enabled.

## Product boundary

- [ ] README and release notes call the product a local-first beta.
- [ ] Documentation explicitly prohibits public internet exposure.
- [ ] No release copy implies authentication, hosted storage, automatic
      application submission, or job-board affiliation.
- [ ] `PRIVACY.md` and `SECURITY.md` reflect current provider and extension
      behavior.

## Installation

- [ ] Test a new clone in a separate directory.
- [ ] Run `npm ci` in `packages/career-core` and `apps/web`.
- [ ] Copy `.env.example` without copying a real secret.
- [ ] Confirm the app starts at `http://localhost:3000`.
- [ ] Confirm the empty/private-data first-run state is understandable.
- [ ] Validate document tools on each claimed operating system.
- [ ] Load the unpacked extension from a clean browser profile.

## Automated validation

- [ ] Web typecheck passes.
- [ ] Web lint passes.
- [ ] All web tests pass.
- [ ] Next.js production build passes.
- [ ] Shared-core typecheck and tests pass.
- [ ] Python tests, skill lint, and security guards pass.
- [ ] Both npm audits report no release-blocking vulnerability.
- [ ] GitHub Actions passes on the exact release commit.

## Manual product validation

- [ ] Import and review neutral evidence.
- [ ] Save one real or neutral test posting.
- [ ] Generate and factual-review an application.
- [ ] Inspect all résumé themes and the coordinated cover letter.
- [ ] Verify ATS PDF, designed PDFs, DOCX files, and phone formatting.
- [ ] Generate, persist, and reopen a cited company report.
- [ ] Create an interview pack and record a neutral outcome.
- [ ] Delete a job and confirm operational cascades.
- [ ] Restore and permanently delete a test application archive.
- [ ] Inspect desktop and mobile navigation, focus states, loading states,
      empty states, errors, and destructive confirmations.

## Licensing and release identity

- [ ] `THIRD_PARTY_NOTICES.md` matches incorporated code, data, fonts, and
      inspiration-only sources.
- [ ] Required MIT, CC BY 4.0, ISC, and OFL notices are present where relevant.
- [ ] Package and extension versions match the release notes.
- [ ] `CHANGELOG.md` contains the release date and summary.
- [ ] Create an annotated prerelease tag such as `v0.2.0-beta.1` only after
      the release commit reaches `master`.
- [ ] Publish GitHub release notes that repeat the localhost-only warning.

## Known beta limitations to repeat

- no authentication or multi-user isolation;
- unencrypted local filesystem storage;
- OpenAI API key and usage charges are the user's responsibility;
- document compilation depends on local external tools;
- browser extension is unpacked and not store-reviewed;
- job-board availability and page markup can change;
- generated documents require human factual and visual review.
