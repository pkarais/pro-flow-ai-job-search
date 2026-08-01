# Pro Flow functional and code audit

Audit date: 2026-07-31  
Release line: `0.2.0-beta.1`  
Scope: local-first web application, shared contracts, browser extension,
document pipeline, storage, AI integrations, Gmail drafts, documentation, and
retained regression tools.

## Executive result

The implemented Pro Flow workflow is internally coherent and suitable for its
stated **local-first public beta** boundary. Automated schema, workflow,
security, extension, archive, document-structure, UI-shell, and regression
tests pass. A production build completes successfully. Both npm dependency
trees report zero known vulnerabilities at the configured audit threshold.

This is not approval for public hosting. The application has no authentication,
multi-user isolation, or encrypted application data. Live AI research, Google
OAuth, changing job-board markup, local PDF executables, and the visual quality
of personal documents remain environment-dependent and require human review.

## Audited functional chain

1. **Career evidence** — imported material retains provenance; users confirm,
   correct, reject, or add controlled evidence; writes are revision-aware,
   atomic, backed up, and schema validated.
2. **Job discovery** — official allowlisted U.S. portal searches use validated
   role/location inputs, four regions, multi-state selection, and direct
   fallback links when pop-ups are blocked.
3. **Browser capture** — an unpacked Manifest V3 extension reads one active
   posting after an explicit click and posts it only to localhost; installation
   status requires a real extension check-in.
4. **Opportunity intake** — imported jobs are normalized, locally deduplicated,
   risk-reviewed, saved, and treated as untrusted content.
5. **Grounded writing** — server-only structured AI writing receives reviewed
   employer-facing evidence and posting context; evidence IDs are validated;
   unknown citations, rejected language, and internal policy leakage fail
   closed.
6. **Final polish** — selectable AI emphasis strategies can be blended; the
   current summary, bullets, and cover letter are rewritten together using the
   complete posting and newest matching company overview as context.
7. **Documents** — one structured résumé feeds ATS and designed paths,
   coordinated cover letters, HTML preview, PDF, DOCX, themes, palettes, and
   formatted U.S. contact information.
8. **Readiness** — compilation, page count, extractable text, contact text,
   keyword survival, current revision, and human visual inspection guard Ready
   and Applied pipeline states.
9. **Company intelligence** — cited overview research separately evaluates
   company history, operating scope, role/title alignment, compensation, and
   questions; direct-application research accepts only public official routes
   and never guesses an address.
10. **Email preparation** — local `.eml` and optional Gmail OAuth workflows
    create reviewable drafts with selected files; recipients remain editable;
    no route sends a message.
11. **Interview preparation** — packs combine verified claims with relevant
    insights into questions, bridge answers, questions to ask, and talking
    points; complete briefs can be drafted to the candidate, copied, or
    downloaded for phone access.
12. **Archive and learning** — authoritative local records feed a rebuildable
    SQLite index, company/role/generation folders, individual downloads, ZIP
    case files, guarded pipeline history, and append-only outcomes.

## Security and privacy findings

- Private runtime data is rooted under gitignored `career-data/`.
- `.env.local`, OAuth configuration, encrypted refresh tokens, generated
  documents, and personal application archives are not tracked.
- Browser-supplied arbitrary filesystem paths and arbitrary shell commands are
  not part of the application contract.
- Fixed document executables and allowlisted artifact filenames reduce command
  and path-injection risk.
- Job descriptions are explicitly untrusted and cannot override system rules.
- AI and Gmail are external processors selected and configured by the local
  user; their current terms, retention rules, and charges remain the user's
  responsibility.
- Local application data is not encrypted by Pro Flow. Operating-system access,
  disk encryption, backups, and physical security are required controls.

## Verification results

| Check | Result |
|---|---|
| Web TypeScript | Passed |
| Web ESLint | Passed |
| Web tests | 65 passed |
| Shared-core TypeScript | Passed |
| Shared-core tests | 12 passed |
| Python regression suite | 132 passed |
| Skill lint | Passed |
| Security guards | Passed |
| Next.js production build | Passed |
| Web dependency audit | 0 vulnerabilities |
| Shared-core dependency audit | 0 vulnerabilities |
| UTF-8 documentation check | Passed |
| Tracked credential-pattern scan | No matches |

The per-application theme audit requires a private application ID and must be
run deliberately with:

```bash
cd apps/web
npm run audit:themes -- <application-id> [output-directory]
```

Do not publish its output when it contains personal information.

## Known beta limitations and residual risks

- No authentication, authorization, tenant isolation, or supported public
  deployment exists.
- Local files are unencrypted and anyone able to reach the running service can
  access the same workspace.
- The extension is unpacked, not browser-store reviewed, and can require reload
  when portal or extension code changes.
- Job-board HTML and external portal behavior can change without notice.
- AI calls can time out, fail, produce weak prose, or return incomplete
  research; citations and claims require human review.
- Compensation analysis is an evidence-based estimate, not a guarantee or
  professional compensation opinion.
- PDF readiness depends on correctly installed local LaTeX, Poppler, and Chrome
  executables plus human visual inspection.
- Node's embedded SQLite support is currently reported as experimental by the
  runtime used during the audit.
- The successful Next.js build emits a non-blocking Turbopack file-tracing
  warning because repository-root discovery intentionally supports launching
  the app from multiple working directories. This should be revisited before
  any future packaged or hosted distribution.
- Automated tests mock or isolate external systems. A real user must still test
  the configured OpenAI account, Gmail OAuth client, browser extension, portal
  pages, document toolchain, and final email drafts.

## Release recommendation

Keep the project labeled `0.2.0-beta.1`, localhost-only, and human-in-the-loop.
Within that boundary, the repository is ready for additional users to clone or
fork, configure their own private workspace, and run the documented workflow.
Do not describe it as a hosted service, autonomous application bot, guaranteed
ATS optimizer, or automatic employer-contact system.
