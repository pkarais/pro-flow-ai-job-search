# Privacy notice for the local-first beta

Pro Flow Career OS 0.2 beta is self-operated software. The project maintainer
does not host the application and does not receive a user's career records by
default.

## Data stored locally

Pro Flow can store:

- career evidence and review decisions;
- contact details used in documents;
- saved job postings and search selections;
- application drafts and claim decisions;
- generated résumé and cover-letter artifacts;
- company-insight reports and citations;
- interview preparation and application outcomes.

These records are stored under the repository's gitignored `career-data`
directory. They are not encrypted by Pro Flow. Operating-system account,
device, disk-encryption, backup, and physical-security controls remain the
user's responsibility.

## Data sent to OpenAI

When an OpenAI API key is configured, task-relevant content is sent directly
from the user's local server to OpenAI for:

- résumé and cover-letter writing;
- interview preparation;
- company research and web search.

The exact content depends on the task and can include reviewed career evidence,
the target job description, company name, role, location, and posting URL.
Users should review OpenAI's current API data policies and avoid entering
highly sensitive identity, financial, medical, or authentication information.

## Job boards and external links

Search actions open official job-board URLs in the user's browser. Those sites
apply their own privacy policies. The optional browser extension reads one
active posting after a user click and sends the extracted fields only to the
local Pro Flow service.

## Indeed Hiring Lab data

The Market Insight card retrieves a public aggregated dataset from the Indeed
Hiring Lab AI Tracker. No candidate record is sent with that dataset request.

## Retention and deletion

Records remain until the user deletes them. Individual application archives
can be permanently deleted from Pro Flow. The complete private web workspace
can be removed by stopping the application and deleting the repository's
`career-data` directory after making any desired backup.

Deletion from the local directory does not delete information previously sent
to an external provider or retained in independent backups.

## Public-host warning

This beta has no authentication or multi-user isolation. Do not expose it to
the internet or a network shared with untrusted users.
