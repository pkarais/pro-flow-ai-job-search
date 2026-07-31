# Pro Flow Job Capture

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

After updating the extension files, return to the Extensions page and click
the extension's reload button before testing another posting.

The capture code is generic and reads Schema.org `JobPosting` JSON-LD first,
then visible page fields. The local server currently accepts LinkedIn, Indeed,
USAJOBS, Dice, Built In, and Wellfound. A future board requires an explicit
portal ID and host mapping in Pro Flow before persistence.
