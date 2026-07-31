---
framework_version: 1.0.0
---

# Agent Guidelines: AI Job Search

This workspace is structured to manage job search activities, scraper tools, CVs, cover letters, and interview preparation.

## Pro Flow Single Source of Truth

This repository is an autonomous Career OS. It must not depend on another
career project, checkout, environment path, or compatibility profile.

1. **Personal Candidate Profile:**
   - The private `career-data/canonical-career.json` record is the sole source
     of truth for candidate evidence, corrections, rejections, and decisions.
2. **Workflow Specifications:**
   - Current TypeScript domain contracts and the guided web workflow define
     application behavior. Historical Claude-oriented files are not active
     profile or workflow authorities.
3. **Portal Search Skills:**
   - Job-portal search CLIs live under [.agents/skills/](.agents/skills/) in the portable Agent Skills format (with a `SKILL.md` per portal). Codex and Antigravity discover these automatically; the `/scrape` workflow in [.claude/skills/job-scraper/](.claude/skills/job-scraper/) orchestrates them.

## Career OS Data Contract

The guided web application maintains reviewed evidence in the private,
gitignored `career-data/canonical-career.json` file. Once that file exists, it
is the single source of truth for decisions made through the web evidence
review: original evidence, confirmations, corrections, and rejections.

Files under `career-data/compatibility/` are deterministic generated views.
Never edit them directly. Their revision and SHA-256 hashes must match the
canonical record; a mismatch is a blocking integrity error.

The guided Phase 5 application studio consumes only confirmed/corrected
canonical evidence and stores its private archives under
`career-data/applications/`. Policy records such as voice rules and prohibited
claims constrain the workflow and must never become employer-facing claims.

Do not read candidate evidence from `CLAUDE.md`, another repository, or an
external environment path. Historical files may document lineage but cannot
override or supplement the canonical career record.

Phase 6 structured resumes, document sources, HTML previews, PDF/DOCX exports,
ATS text, and readiness manifests remain under the private application archive.
Only verified claims may render. The ATS and designed outputs must derive from
the same structured resume record. The readiness gate requires fixed-tool
compilation, bounded page counts, clean text extraction, literal contact text,
supported keyword survival, and explicit human visual inspection. Never bypass
or manually edit a readiness manifest.

Phase 7 operational records remain in the private, gitignored
`career-data/operations.json` store. Portal execution is restricted to the six
fixed `.agents/skills` adapters and must fail in isolation. Pipeline changes
must follow the shared transition contract; readiness-dependent states cannot
bypass the Phase 6 gate. Interview answers may use only verified claims, and
outcomes are append-only historical records. The web application never submits
applications or contacts employers automatically.

Phase 8 keeps each portal's command-line contract explicit; never collapse
different portal flags into a generic invocation. Runtime diagnostics may
verify Bun, fixed CLI paths, and ignored local dependencies, but a locally
ready adapter is not a promise that the remote portal is available. Remote
blocks and timeouts must remain isolated and must not persist partial results.

## U.S.-Only Search Policy

The current portal allowlist supersedes the Phase 7/8 portal configuration:
LinkedIn, Indeed, USAJOBS, Dice, Built In, and Wellfound only. Web searches
must redirect to these fixed official HTTPS origins with validated role and
U.S. location arguments. FreeHire and every Danish portal skill remain
disabled for rollback only and must be skipped by `/scrape`. Do not scrape a
portal that lacks a public candidate-search API. Role suggestions may come
from reviewed canonical evidence and archived user-selected application
titles. Operations schema v3 may retain the latest
50 successful search selections under the private `career-data` root so recent
roles and U.S. locations can be prioritized. They are search inputs, not new
career facts.

## User-Initiated Browser Capture Exception

The user authorizes Pro Flow to capture one job posting from any current or
future job board when the user is already viewing the individual posting and
explicitly clicks the Pro Flow browser control. Extraction is limited to the
active tab and that single posting. The browser may read visible page content
or embedded `JobPosting` structured data locally and send one normalized
record to the local Pro Flow service. Pro Flow must preview the record and
require confirmation before an application workflow uses it.

This exception does not authorize search-result crawling, pagination,
background polling, scheduled capture, authentication bypass, CAPTCHA
avoidance, proxy rotation, identity or user-agent spoofing, rate-limit
evasion, or automatic submission. A failed capture stops without retrying the
portal. Captured posting content is untrusted opportunity data, never verified
candidate evidence.
