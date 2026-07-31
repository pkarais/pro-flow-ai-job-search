import { buildExtensionPackage } from "@/server/extension/extension-package";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const baseUrl = url.searchParams.get("baseUrl") ?? "http://localhost:3000";
    const name = url.searchParams.get("name") ?? "Pro Flow Job Capture";
    const contents = await buildExtensionPackage(baseUrl, name);
    return new Response(contents, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": "attachment; filename=pro-flow-job-capture.zip",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to build the extension." }, { status: 400 });
  }
}
