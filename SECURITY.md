# Security policy

## Supported versions

| Version | Supported |
|---|---|
| `0.2.x` local-first beta | Yes |
| Earlier Pro Flow checkpoints | No |
| Publicly hosted deployments | Not supported |

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/pkarais/pro-flow-ai-job-search/security/advisories/new).
Do not publish API keys, private career data, exploit steps, or working proofs
of concept in a public issue.

If private reporting is unavailable, open a public issue that only states the
general class of problem and asks the maintainer to establish a private contact
channel.

## Local-first beta boundary

Pro Flow stores sensitive career evidence, applications, generated documents,
company research, interview preparation, and outcomes on the local filesystem.
Version 0.2 beta has no authentication, multi-user isolation, encrypted remote
database, or public-host security layer.

Run it only on a trusted computer at `http://localhost:3000`.

Do not:

- bind it to a public network interface;
- expose it through a tunnel, reverse proxy, router, or cloud deployment;
- share the `career-data` directory;
- commit `.env.local`, provider keys, source documents, or generated artifacts;
- assume that browser access from another local user is isolated.

Anyone who can reach the running local application can use its APIs and access
the same private workspace.

## Threat model

The primary risks are:

1. untrusted job-posting text entering an AI-assisted workflow;
2. private candidate evidence being sent to a configured model provider;
3. local API access to unencrypted career records and documents;
4. secrets or generated personal data being committed accidentally;
5. third-party portal behavior, rate limits, and terms changing;
6. generated prose containing unsupported or misleading claims.

Current mitigations include:

- posting text is handled as untrusted data rather than agent instructions;
- only reviewed canonical evidence may support employer-facing claims;
- rejected claims must be regenerated before document readiness;
- private data, environment files, and generated documents are gitignored;
- canonical writes use schema validation, revisions, backups, and atomic
  replacement;
- application status cannot bypass document-readiness gates;
- browser capture is user initiated and limited to the active tab;
- no automatic submission, messaging, or employer contact exists;
- CI runs security guards and dependency audits.

These controls reduce risk; they do not turn the beta into a secure hosted
service.

## Provider privacy

Fresh résumé writing, cover-letter writing, interview preparation, and company
research can send task-relevant content to OpenAI when an API key is configured.
Users are responsible for reviewing the provider's policies, managing API
usage, and deciding which personal information is appropriate to transmit.

Do not put Social Security numbers, banking information, identity documents,
medical information, account passwords, or security answers into Pro Flow.

## Browser extension

The unpacked extension requests `activeTab` and `scripting`. It reads the
currently active supported job-posting page only after the user clicks the
toolbar button and sends the extracted posting to localhost. It is not a
published Chrome Web Store extension and has not been reviewed by Google or
Microsoft.

## Before publishing a fork

Run:

```bash
git status --short
git check-ignore -v career-data/canonical-career.json
git check-ignore -v career-data/operations.json
git check-ignore -v apps/web/.env.local
python tools/security_guards.py
```

Also search the complete Git history for any secret or personal value that may
have been committed earlier. Adding a file to `.gitignore` does not remove it
from existing history.
