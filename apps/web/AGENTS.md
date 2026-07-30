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

Phase 2 is fixture-only. Do not read or write personal candidate data, execute
job-search tools, call AI providers, or access application archives.
