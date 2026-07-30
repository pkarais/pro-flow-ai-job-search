---
framework_version: 1.0.0
---

# Agent Guidelines: AI Job Search

This workspace is structured to manage job search activities, scraper tools, CVs, cover letters, and interview preparation.

## Thin-Pointer Design (Single Source of Truth)

To prevent duplication and configuration drift across different AI agent frameworks (Claude Code, Google Antigravity, Codex, Cursor, Gemini CLI, etc.), this workspace uses a unified thin-pointer design. All agent runtimes should load the canonical specifications and candidate profiles from the files and directories below:

1. **Personal Candidate Profile:**
   - The candidate profile, contact details, education, and target preferences are defined in [CLAUDE.md](CLAUDE.md) and the individual profile methodology files under [.claude/skills/job-application-assistant/](.claude/skills/job-application-assistant/) (specifically `01-*.md` etc.).
2. **Canonical Workflow Specifications:**
   - The step-by-step instructions and triggers for tasks (setup, scrape, rank, apply, upskill, interview) are defined in the [.claude/](.claude/) directory (specifically under `.claude/skills/` and `.claude/commands/`).
   - Do not duplicate these rules or specifications. Treat `.claude/` files as the single source of truth.
3. **Portal Search Skills:**
   - Job-portal search CLIs live under [.agents/skills/](.agents/skills/) in the portable Agent Skills format (with a `SKILL.md` per portal). Codex and Antigravity discover these automatically; the `/scrape` workflow in [.claude/skills/job-scraper/](.claude/skills/job-scraper/) orchestrates them.

## Hybrid Career OS Transition

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

The existing `CLAUDE.md`, `.claude/skills/job-application-assistant/`, and
master-CV grounding union remain the active inputs for legacy agent commands.
Do not manually copy web-review decisions into legacy profile files or claim
that the legacy `/apply` command consumed the canonical record.
