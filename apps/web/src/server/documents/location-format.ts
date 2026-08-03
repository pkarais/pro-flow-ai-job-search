export function formatJobLocation(value: string): string {
  return value
    .replace(/^\s*\d+(?:\.\d+)?\s*(?:min(?:ute)?s?|hr|hrs|hours?)\s*(?:drive\s*)?[·•|\-–—:]\s*/i, "")
    .replace(/^[·•|\-–—:]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}
