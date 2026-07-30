<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may
differ from training data. Read the relevant guide in
`node_modules/next/dist/docs/` before changing framework behavior and heed
deprecation notices.
<!-- END:nextjs-agent-rules -->

The shared domain contracts live in `../../packages/career-core`. This web app
must consume those contracts rather than create competing profile, opportunity,
application, or workflow types.

Phase 3 permits read-only access to the explicitly allowlisted Executive Career
OS evidence files through the server-only importer. Do not add profile writes,
mutation endpoints, arbitrary file paths, job-search execution, AI providers,
or application archive access.
