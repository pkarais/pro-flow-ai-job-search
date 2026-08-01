# Pro Flow Job Capture

Beta version: `0.2.0`. This is an unpacked, local-development extension. It is
not published in or reviewed by the Chrome Web Store or Microsoft Edge Add-ons.

This unpacked browser extension captures exactly one job posting from the
active tab after you click its toolbar button. It does not crawl search
results, paginate, run in the background, or send the job board URL to a
server for retrieval.

## Install in Chrome or Edge

1. Keep Pro Flow running at `http://localhost:3000`.
2. Open the browser's Extensions page and enable Developer mode.
3. Choose **Load unpacked** and select this `browser-extension` directory.
4. Pin **Pro Flow Job Capture**.
5. Open an individual supported posting and click the extension once.
6. An `OK` badge confirms the local import and Pro Flow opens the Jobs view.

Use the extension on an individual posting, not a portal search-results page.
Wait for the posting's title, company, location, and description to finish
loading before clicking. Review the imported record in Pro Flow before using
it to generate an application.

After updating the extension files, return to the Extensions page and click
the extension's reload button before testing another posting.

The Pro Flow toolbar label turns green only after this installed extension
checks in with the currently running local workspace. Downloading the ZIP alone
does not prove installation. If the label remains red, confirm Pro Flow is
running on the same port, reload the extension card, click the extension on a
posting, and refresh Pro Flow.

If a portal reuses a single-page tab and a capture appears stale, navigate to
the new individual posting, wait for its visible content and URL to update,
refresh the tab if necessary, and click once. The extension performs a fresh
extraction on every click; it does not intentionally cache the prior job.

The capture code is generic and reads Schema.org `JobPosting` JSON-LD first,
then visible page fields. The local server currently accepts LinkedIn, Indeed,
USAJOBS, Dice, Built In, and Wellfound. A future board requires an explicit
portal ID and host mapping in Pro Flow before persistence.

## Permissions and privacy

- `activeTab` grants temporary access only to the tab where the user clicks the
  extension.
- `scripting` runs the visible-posting extractor in that tab.
- Host permissions cover only the local Pro Flow service on port 3000.
- No search-result crawling, scheduled activity, account login, password
  access, or remote analytics are implemented.
- Captured title, company, location, description, posting date, and URL are
  sent to `http://localhost:3000` and stored in the private `career-data`
  workspace.

The extension still reads whatever posting content the active page exposes.
Review a captured record before using it. Do not run Pro Flow on an untrusted
network or expose its local API to the internet.

## Forking the extension

If your fork changes the port, supported portals, captured fields, external
destinations, or permissions, update `manifest.json`, `background.js`, this
privacy disclosure, and the root `THIRD_PARTY_NOTICES.md`. Chrome Web Store
publication would additionally require store icons, screenshots, listing copy,
a hosted privacy policy, and compliance with the store's current policies.
