# Third-party notices and project inspiration

Pro Flow Career OS is an independently maintained local-first project. This
file distinguishes incorporated material and data from repositories that were
reviewed only for ideas. Conceptual credit does not imply endorsement,
affiliation, or ownership of Pro Flow.

## Incorporated foundation

### MadsLorentzen/ai-job-search

- Repository: <https://github.com/MadsLorentzen/ai-job-search>
- License: MIT
- Relationship: Pro Flow began as an attributed fork and retains substantial
  workflow, methodology, agent-command, LaTeX-template, test, documentation,
  and Pip mascot lineage from that project.
- Required notice: the root `LICENSE` retains the upstream copyright and MIT
  permission notice.

The original project also credited Mikkel Krogholm's portable job-search skill
work at <https://github.com/mikkelkrogsholm/skills>; that credit is preserved.

### Indeed Hiring Lab AI Tracker

- Repository: <https://github.com/hiring-lab/ai-tracker>
- License: Creative Commons Attribution 4.0 International
- Relationship: Pro Flow reads the public `AI_posting.csv` dataset at runtime
  to display aggregated U.S. AI-posting context. It does not use that dataset
  to change an individual job's match score.
- Attribution: Indeed Hiring Lab, “AI Tracker,” CC BY 4.0.

## Bundled fonts

The original cover-letter templates bundle Lato and Raleway font files under
`cover_letters/OpenFonts/fonts/`.

- Lato: designed by Łukasz Dziedzic; SIL Open Font License 1.1.
- Raleway: originally designed by Matt McInerney and expanded by Pablo Impallari
  and Rodrigo Fuenzalida; SIL Open Font License 1.1.
- License text: `docs/licenses/OFL-1.1.txt`.

## Repositories reviewed for inspiration

Unless explicitly stated above, Pro Flow did not vendor these repositories,
install them as dependencies, or copy their source code. They informed product
questions and independent implementation choices.

| Project | Observed idea | How Pro Flow independently applied it | Detected license |
|---|---|---|---|
| [Donzhu2020/job-tracker](https://github.com/Donzhu2020/job-tracker) | Search aggregation, scoring, deduplication, user selection before drafting | Saved-job workspace, explainable scoring, duplicate marking, and user-controlled application creation | No license detected; ideas only, no code copied |
| [GhostJobDetector/Ghost-Job-Detector](https://github.com/GhostJobDetector/Ghost-Job-Detector) | Categorized posting-risk signals and rule-based fallback | Local fraud, privacy, urgency, content, and staleness warnings that preserve uncertainty | No license detected; ideas only, no code copied |
| [ebltzr/capstone](https://github.com/ebltzr/capstone) | Full-stack job search, saved searches, user profiles, and application tracking | Guided local workspace connecting evidence, jobs, applications, pipeline, interviews, and outcomes | No license detected; ideas only, no code copied |
| [tarunsinghal92/indeedscrapperlatest](https://github.com/tarunsinghal92/indeedscrapperlatest) | Multi-location job discovery and full-description capture | Helped frame the need for complete posting text; Pro Flow chose user-initiated browser capture rather than adopting its scraper | MIT; no code copied |
| [hiring-lab/ai-tracker](https://github.com/hiring-lab/ai-tracker) | Public labor-market AI-posting data | Incorporated as the cited Market Insight dataset described above | CC BY 4.0; data used with attribution |
| [weberwcwei/job-scout](https://github.com/weberwcwei/job-scout) | Cross-source normalization, match scoring, dealbreakers, risk isolation, and application status | Explainable local scores, dealbreaker visibility, isolated portal failures, saved jobs, export, and guarded pipeline state | MIT; no code copied |
| [phoinixi/resuml](https://github.com/phoinixi/resuml) | Structured résumé data, theme selection, browser rendering, ATS checks, and PDF export | Structured evidence-grounded résumé schema, five independent templates, live HTML preview, coordinated cover letter, and separate ATS/designed export paths | ISC; no code copied |

## Executive Career OS synthesis

Executive Career OS was a private predecessor created by `@pkarais`. It was
not a third-party dependency and is no longer read at runtime. It supplied the
initial career-knowledge corpus and the concept of one evidence-grounded
application package containing résumé, cover letter, ATS analysis, interview
talking points, factual audit, and missing-information review.

During Pro Flow's development, that concept was reconsidered alongside the
projects above. The resulting implementation was written inside this
repository:

- the original AI Job Search methodology became a guided web workflow;
- Executive Career OS evidence became a project-owned canonical record;
- job-tracker projects influenced saved-job, scoring, and pipeline ergonomics;
- ghost-job analysis influenced explicit posting-risk categories;
- RésumL influenced the move from cosmetic document variables to structured
  content plus independent HTML/CSS renderers;
- Indeed Hiring Lab supplied the one incorporated external market dataset;
- the final system added factual-review gates, readiness manifests, private
  archives, background company research, interview preparation, and human
  control over every external action.

“Inspired by” means that a project helped define a useful problem, comparison,
or design direction. It does not mean its source code or branding was used.

## Trademarks and services

OpenAI, Anthropic, LinkedIn, Indeed, USAJOBS, Dice, Built In, Wellfound, Chrome,
Edge, and other names belong to their respective owners. Pro Flow is not
affiliated with or endorsed by those organizations.
