---
name: public-application-contact
description: Find and verify public, employer-authorized ways to apply directly for a job. Use when a job posting lacks a clear application email, when researching an employer's careers or contact pages, or when inspecting supplied HTML for published email addresses and official application routes. Never guess addresses, harvest personal emails, probe hidden endpoints, submit forms, or contact anyone automatically.
---

# Public Application Contact

Find the best legitimate public application route while preserving uncertainty. Prefer a role-specific application address or official careers page. A general company contact form is only a fallback and must be labeled as such.

## Workflow

1. Record the job title, company, posting URL, location, and any address shown in the posting.
2. Establish the employer's official domain. Do not assume that a job board, recruiter, tracking redirect, or similarly named site is the employer.
3. Inspect the original posting first for a published application email, application URL, recruiter contact, or employer website.
4. Follow only public pages on the verified employer domain or a clearly identified official applicant-tracking system. Prioritize careers, jobs, join-us, contact, about, location, and leadership pages.
5. For saved HTML, run `python scripts/extract_public_contacts.py INPUT --source-url URL --official-domain DOMAIN`. Treat its output as candidates requiring contextual review, not automatic approval.
6. Inspect visible text and public page markup for `mailto:` links, plain or entity-encoded addresses, JSON-LD contact data, and Cloudflare-protected email elements. JavaScript-rendered visible contact details may be read after the page loads.
7. Classify each route using the hierarchy below, document the evidence, and return the highest-quality usable route. If none exists, say so plainly.

## Route hierarchy

1. `specific_job_application`: explicitly tied to the exact posting or requisition.
2. `recruiting_or_hr`: an employer-published recruiting, talent, careers, jobs, or human-resources address.
3. `official_careers_page`: a public careers page or official application form.
4. `general_company_contact`: a public company email, phone number, or contact form with no hiring context. This is a fallback, not a recruiting contact.
5. `not_usable`: unrelated, ambiguous, private, inferred, or prohibited contact information.

## Verification rules

- Require a source URL and nearby context for every reported email or route.
- Prefer exact published addresses over generic forms, and official careers forms over sales or support channels.
- Use `high` confidence only for an employer-published address in explicit hiring context; use `medium` for a published employer-domain address with less explicit purpose; use `low` for general forms or phone numbers.
- Reject addresses in examples, placeholders, scripts, templates, comments, privacy text, third-party widgets, or unrelated linked domains.
- Exclude sales, support, billing, investor, press, legal, privacy, abuse, security, webmaster, no-reply, and personal employee addresses unless the page explicitly directs applicants there.
- Never construct an address from a person's name or a company pattern.
- Never probe SMTP, DNS, undocumented APIs, webhooks, form processors, admin routes, source maps, or leaked configuration.
- Never bypass authentication, anti-bot controls, rate limits, or access restrictions.
- Never submit a form, send an email, or contact an employer without a separate explicit user action.

## HTML interpretation

- `mailto:careers@example.com` in a careers section is strong evidence.
- `you@company.com` inside an email input placeholder is an example, not a contact.
- A `fetch(...)` destination or automation webhook is transport infrastructure, not an email address or application route.
- A project-estimate or sales-consultation form is not a careers form merely because it appears on the employer's site.
- Structured data must describe the employer or recruiting contact; do not elevate incidental vendor addresses.

## Output contract

Return `status`, `company`, `jobTitle`, `bestRoute`, `alternatives`, `rejectedCandidates`, and `notes`. Each usable route must include `type`, `value`, `sourceUrl`, a short evidence paraphrase, and `confidence`. Set `bestRoute` to `null` instead of manufacturing a result. Status must be one of `verified_route_found`, `fallback_only`, or `no_public_route_found`.

## Supplied-page example

For HTML containing only an email-field placeholder, a general project-consultation form, a phone number, and an automation webhook, report `fallback_only` or `no_public_route_found`. Reject the placeholder and webhook. Describe the form and phone number as general business contacts, not direct job-application channels.
