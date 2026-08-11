export function localBrowserOrigin(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || request.headers.get("host")?.trim() || "";
  if (!/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(host)) {
    throw new Error("Gmail setup is available only from the local Pro Flow application.");
  }
  return `http://${host}`;
}
