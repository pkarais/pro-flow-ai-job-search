# Indeed MCP Adaptation for Pro Flow

Status: design-ready, connection unavailable outside the documented Claude
Connector as of July 30, 2026.

Official source: <https://docs.indeed.com/mcp>

## Objective

Use Indeed's authorized MCP tools to search its live marketplace and import a
user-selected posting into Pro Flow without scraping Indeed pages, imitating a
human browser, or asking the user to retype job fields.

This adapter is optional. Pro Flow must continue to work when the Indeed MCP
connector is absent, unauthenticated, rate-limited, or unavailable.

## What Indeed documents

Indeed describes a remote MCP server using Streamable HTTP and four tools:

| Indeed tool | Documented capability | Pro Flow use |
| --- | --- | --- |
| Job Search | Search by title, keywords, location, and employment type | Discover jobs using the user's confirmed role and U.S. location |
| Job Detail | Retrieve description, requirements, qualifications, benefits, company information, and a direct link by job ID | Import one job explicitly selected by the user |
| Get Resume | Retrieve the authenticated account holder's Indeed resume | Optional onboarding preview only; never update canonical evidence directly |
| Get Company Data | Retrieve employer, culture, compensation, and review data | Optional research context; never treat it as a candidate fact or employer-facing claim |

Indeed currently documents the connector as beta and available only through
Claude Connector. The documentation does not publish a general endpoint,
client-registration procedure, tool schemas, or authorization scopes for a
standalone Pro Flow client. Do not infer any of those values.

## Claude instructions translated to Pro Flow

Indeed's documented Claude sequence is:

1. Open Claude.
2. Open Search & Tools.
3. Add the Indeed connector.
4. Sign in to Indeed.
5. Ask Claude to search Indeed jobs.

The equivalent Pro Flow sequence is:

1. At runtime, inspect the agent session's available tools for an authenticated
   Indeed MCP connector.
2. If the connector is absent or exposes no usable job tools, report
   `Indeed structured import unavailable` and retain the official-search-link
   and manual-import fallbacks. Do not initiate repeated login prompts.
3. Ask the user for, or reuse, a confirmed role and U.S. location.
4. Call Indeed Job Search once with those explicit inputs.
5. Present normalized summaries. Do not persist every result.
6. When the user selects a result, call Job Detail once using the returned job
   identifier.
7. Validate and normalize the response through `career-core`.
8. Show a confirmation preview containing the source, title, company,
   location, URL, description, and any missing fields.
9. Persist only after the user confirms the selected posting.

## Pro Flow request contract

The provider-facing request must remain tool-name agnostic:

```ts
type IndeedSearchInput = {
  query: string;
  location: string;
  employmentType?: string;
  limit: number;
};

type IndeedJobSelection = {
  jobId: string;
  expectedUrl?: string;
};
```

Constraints:

- `query` is a user-confirmed role, title, or keyword.
- `location` is normalized to a U.S. location.
- `limit` is bounded to a small result set; default 10, maximum 20.
- Search is user initiated. No background polling or crawling.
- A detail request follows an explicit user selection.
- Tool arguments are structured values, never shell commands.

## Normalization contract

Map an authorized Job Detail response into the existing `NormalizedJob`
contract:

| Pro Flow field | Indeed source |
| --- | --- |
| `portal` | Constant `indeed-search` |
| `externalId` | Indeed job ID returned by the connector |
| `title` | Job Detail title |
| `company` | Job Detail company |
| `location` | Job Detail location, when present |
| `url` | Direct Indeed application or posting URL |
| `description` | Job Detail description |
| `postedAt` | Returned posting date, when present |
| `firstSeenAt` | Pro Flow import timestamp |

Salary, benefits, qualifications, and requirements may be retained in a
provider payload or import preview after the domain schema explicitly supports
them. Do not silently concatenate them into verified candidate evidence.

The match score, matched terms, and gaps must be computed by Pro Flow from
reviewed canonical evidence. They must not be invented from missing connector
fields.

## Authentication and secrets

- Authentication belongs to the Indeed connector and the user's Indeed
  account.
- Pro Flow must not collect or store an Indeed password.
- Pro Flow must not place OAuth tokens, cookies, connector URLs, or personal
  Indeed data in tracked files, browser URLs, logs, or fixtures.
- An authentication failure ends that Indeed operation. It must not retry in a
  loop or block other portals.
- If Indeed later publishes a general client flow, add it only from the
  official endpoint, scopes, and registration instructions.

## Canonical-evidence boundary

Indeed job data describes an opportunity, not the candidate. Importing a job
must not change `canonical-career.json`.

If Get Resume is ever enabled:

1. Treat it as a new read-only evidence source.
2. Stage the result as an import preview with provenance.
3. Require the existing evidence-review workflow.
4. Promote only individually confirmed or corrected facts.
5. Never overwrite canonical facts merely because Indeed returned a value.

## Failure isolation

| Condition | Required behavior |
| --- | --- |
| Connector missing | Show official Indeed search link and manual import |
| Connector requires authentication | Give one concise connection instruction; do not loop |
| Job Search fails | Report Indeed unavailable; leave other portals usable |
| Job Detail fails | Keep the selected summary and offer manual import |
| Required field missing | Show the preview with that field marked missing |
| Duplicate URL or job ID | Reuse the existing saved job |
| Remote rate limit | Stop Indeed calls and report the limit; do not evade it |

## Activation gate

Implementation may be activated only when at least one of these is true:

1. The current agent runtime exposes Indeed's authenticated MCP job tools; or
2. Indeed publishes and authorizes a general MCP endpoint/client flow for this
   use case.

Before activation, verify with a test account:

- the exact tool names and input/output schemas;
- authentication behavior and token ownership;
- Job Search fields and pagination;
- Job Detail lookup from both returned IDs and public URLs;
- permitted storage and display behavior under the applicable terms;
- graceful handling of expired authentication and unavailable jobs.

Until the activation gate is met, the app must not claim that Indeed MCP is
connected or that URL-only import is available.

## Codex runtime binding

Codex already provides the universal Streamable HTTP MCP client required for
this integration. A separate client that impersonates Claude is neither
required nor permitted. Once Indeed supplies the authorized connection
parameters, configure the runtime using the supported interface:

```powershell
codex mcp add indeed --url <INDEED_AUTHORIZED_MCP_URL> `
  --oauth-client-id <INDEED_ISSUED_CLIENT_ID> `
  --oauth-resource <INDEED_DOCUMENTED_RESOURCE>

codex mcp login indeed --scopes <INDEED_DOCUMENTED_SCOPES>
```

Only include `--oauth-client-id`, `--oauth-resource`, and `--scopes` when
Indeed explicitly supplies those values. If Indeed instead authorizes a bearer
token, store it outside the repository and reference its environment-variable
name with `--bearer-token-env-var`; never put the token in the command or a
tracked file.

After authentication:

```powershell
codex mcp list
```

Start a new Codex session and verify that the server exposes the documented
Job Search and Job Detail capabilities before enabling structured import.

Do not:

- copy an endpoint, OAuth client ID, token, cookie, or redirect URI from
  Claude's private configuration or browser traffic;
- identify the client as Claude or replay Claude-issued credentials;
- guess the endpoint from DNS names or undocumented routes;
- configure a placeholder server and report it as connected.
