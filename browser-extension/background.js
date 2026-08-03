const PORTALS = [
  { host: /(^|\.)linkedin\.com$/, id: "linkedin-search" },
  { host: /(^|\.)indeed\.com$/, id: "indeed-search" },
  { host: /(^|\.)usajobs\.gov$/, id: "usajobs-search" },
  { host: /(^|\.)dice\.com$/, id: "dice-search" },
  { host: /(^|\.)builtin\.com$/, id: "builtin-search" },
  { host: /(^|\.)wellfound\.com$/, id: "wellfound-search" }
];

function portalFor(url) {
  const hostname = new URL(url).hostname;
  return PORTALS.find((portal) => portal.host.test(hostname))?.id;
}

async function checkInWithProFlow() {
  try {
    await fetch("http://localhost:3000/api/extension/status", {
      method: "POST",
      headers: { "x-pro-flow-extension": "installed-v1" }
    });
  } catch {}
}

chrome.runtime.onInstalled.addListener(() => void checkInWithProFlow());
chrome.runtime.onStartup.addListener(() => void checkInWithProFlow());
void checkInWithProFlow();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url?.startsWith("http")) return;
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: captureVisibleJob
    });
    const portal = portalFor(result.url);
    if (!portal) throw new Error("This job board is not registered in Pro Flow.");
    if (!result.title || !result.company) throw new Error("The active job title or company could not be read.");
    const response = await fetch("http://localhost:3000/api/operations/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-pro-flow-capture": "user-initiated-v1"
      },
      body: JSON.stringify({ ...result, portal })
    });
    if (!response.ok) throw new Error("Pro Flow rejected the captured posting.");
    await checkInWithProFlow();
    await chrome.action.setBadgeText({ tabId: tab.id, text: "OK" });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#16794b" });
    await chrome.action.setTitle({ tabId: tab.id, title: `Captured: ${result.company} — ${result.title}` });
    await chrome.tabs.create({ url: "http://localhost:3000/operations#jobs" });
  } catch (error) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#b42318" });
    await chrome.action.setTitle({ tabId: tab.id, title: error instanceof Error ? error.message : "Capture failed" });
  }
});

async function captureVisibleJob() {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  const browserUrl = window.location.href;
  const isIndeed = /(^|\.)indeed\.com$/.test(window.location.hostname);
  const browserParams = new URL(browserUrl).searchParams;
  const selectedCard = document.querySelector(
    '[aria-selected="true"][data-jk], [data-jk][class*="selected"], [data-jk][class*="active"]'
  );
  const indeedKey = browserParams.get("jk")
    || browserParams.get("vjk")
    || selectedCard?.getAttribute("data-jk")
    || document.querySelector("[data-jk] a[aria-current='page']")?.closest("[data-jk]")?.getAttribute("data-jk");
  const currentUrl = isIndeed && indeedKey
    ? `https://www.indeed.com/viewjob?jk=${encodeURIComponent(indeedKey)}`
    : browserUrl;

  function jobPostingJson() {
    const postings = [];
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const parsed = JSON.parse(script.textContent || "");
        const candidates = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
        postings.push(...candidates.filter((item) => item?.["@type"] === "JobPosting"));
      } catch {}
    }
    const currentKey = indeedKey || new URL(currentUrl).searchParams.get("jk");
    if (currentKey) {
      const matching = postings.find((posting) => {
        const identifier = typeof posting.identifier === "object" ? posting.identifier?.value : posting.identifier;
        return String(posting.url || "").includes(currentKey) || String(identifier || "").includes(currentKey);
      });
      if (matching) return matching;
    }
    if (isIndeed && currentKey) return {};
    return postings.at(-1) || {};
  }
  function normalizedText(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  function decodedHtmlText(value) {
    if (!value) return "";
    const container = document.createElement("div");
    container.innerHTML = String(value)
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|ul|ol|h[1-6]|section)>/gi, "\n");
    container.querySelectorAll("script, style, noscript, template, svg").forEach((element) => element.remove());
    return normalizedText(container.textContent);
  }
  function assignedJson(marker) {
    for (const script of document.scripts) {
      const source = script.textContent || "";
      const markerIndex = source.indexOf(marker);
      if (markerIndex < 0) continue;
      const start = markerIndex + marker.length;
      let depth = 0;
      let quote = "";
      let escaped = false;
      for (let index = start; index < source.length; index += 1) {
        const character = source[index];
        if (quote) {
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === quote) quote = "";
          continue;
        }
        if (character === '"' || character === "'") {
          quote = character;
          continue;
        }
        if (character === "{") depth += 1;
        if (character === "}") {
          depth -= 1;
          if (depth === 0) {
            try { return JSON.parse(source.slice(start, index + 1)); } catch { return null; }
          }
        }
      }
    }
    return null;
  }
  function indeedJobRecord() {
    if (!isIndeed || !indeedKey) return null;
    const viewJobData = assignedJson("window._initialData.viewJobSSRData=");
    const results = viewJobData?.hostQueryExecutionResult?.data?.jobData?.results;
    if (!Array.isArray(results)) return null;
    return results.map((result) => result?.job).find((job) => job?.key === indeedKey) || null;
  }
  function contentText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("script, style, noscript, template, svg").forEach((item) => item.remove());
    return normalizedText(clone.textContent);
  }
  function textCandidates(selectors) {
    const candidates = [];
    for (const selector of selectors) {
      const elements = [...document.querySelectorAll(selector)];
      for (const element of elements) {
        if (element.getAttribute("aria-hidden") === "true") continue;
        if (!element.getClientRects().length) continue;
        const rendered = normalizedText(element.innerText);
        const complete = contentText(element);
        if (rendered) candidates.push(rendered);
        if (complete && complete !== rendered) candidates.push(complete);
      }
    }
    return candidates;
  }
  function text(selectors) {
    return textCandidates(selectors).sort((left, right) => right.length - left.length)[0] || "";
  }
  function prioritizedText(selectors) {
    for (const selector of selectors) {
      const candidates = textCandidates([selector]);
      if (candidates.length) return candidates.sort((left, right) => left.length - right.length)[0];
    }
    return "";
  }
  function prioritizedDescription(selectors) {
    for (const selector of selectors) {
      const candidates = textCandidates([selector]).filter((candidate) => candidate.length >= 120);
      if (candidates.length) return candidates.sort((left, right) => right.length - left.length)[0];
    }
    return "";
  }
  const indeedRecord = indeedJobRecord();
  const data = jobPostingJson();
  const organization = typeof data.hiringOrganization === "object" ? data.hiringOrganization?.name : "";
  const location = Array.isArray(data.jobLocation) ? data.jobLocation[0] : data.jobLocation;
  const address = location?.address || {};
  const locationText = [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(", ");
  const keyedCompanyAnchor = isIndeed && indeedKey
    ? [...document.querySelectorAll('a[href*="fromjk="]')].find((anchor) => {
      try { return new URL(anchor.href, browserUrl).searchParams.get("fromjk") === indeedKey; } catch { return false; }
    })
    : null;
  const keyedCompany = normalizedText(keyedCompanyAnchor?.innerText || keyedCompanyAnchor?.textContent);
  const visibleTitle = prioritizedText([
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '[data-testid="simpler-jobTitle"]',
    "h1.jobsearch-JobInfoHeader-title",
    ".jobsearch-JobInfoHeader-title-container h1",
    '[data-testid*="title"]',
    '[class*="job-title"]',
    "h1"
  ]);
  const visibleCompany = prioritizedText([
    '[data-testid="inlineHeader-companyName"]',
    '[data-testid="company-name"]',
    '[data-company-name="true"]',
    ".jobsearch-InlineCompanyRating-companyHeader",
    '[data-testid*="company"]',
    '[class*="company"]',
    '[itemprop="hiringOrganization"]'
  ]);
  const visibleLocation = prioritizedText([
    '[data-testid="job-location"]',
    '[data-testid="inlineHeader-companyLocation"]',
    ".jobsearch-JobInfoHeader-subtitle",
    '[data-testid*="location"]',
    '[class*="location"]'
  ]);
  const visibleDescription = prioritizedDescription([
    "#jobDescriptionText",
    "#job-details",
    ".jobs-description__content",
    ".jobs-box__html-content",
    '[data-testid="job-description"]',
    '[data-testid="jobDescription"]',
    '[data-testid="jobsearch-jobDescriptionText"]',
    '[data-testid="job-details"]',
    '[data-automation="jobDescription"]',
    '[data-cy="job-description"]',
    '[class*="job-description"]',
    '[itemprop="description"]',
    '[data-testid*="description"]',
    '[class*="jobDescription"]',
    '[class*="description"]'
  ]);
  const structuredDescription = data.description
    ? decodedHtmlText(data.description)
    : "";
  const keyedDescription = decodedHtmlText(indeedRecord?.description?.html);
  return {
    url: currentUrl,
    title: isIndeed ? indeedRecord?.title || visibleTitle || data.title : data.title || visibleTitle,
    company: isIndeed ? indeedRecord?.sourceEmployerName || keyedCompany || visibleCompany || organization : organization || visibleCompany,
    location: isIndeed ? indeedRecord?.location?.fullAddress || visibleLocation || locationText : locationText || visibleLocation,
    description: (isIndeed ? keyedDescription || visibleDescription || structuredDescription : structuredDescription || visibleDescription).slice(0, 50_000),
    postedAt: isIndeed && indeedRecord?.datePublished
      ? new Date(indeedRecord.datePublished).toISOString()
      : data.datePosted || undefined
  };
}
