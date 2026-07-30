# Pro-Flow Career OS Web

The isolated Next.js shell for the guided Pro-Flow Career OS experience.

The dashboard uses validated neutral fixtures. Phase 3 can additionally preview
12 explicitly allowlisted Executive Career OS evidence files through a
server-only, read-only importer. It cannot write Pro-Flow profile files, call AI
providers, or execute portal tools.

To enable the local preview, copy `.env.example` to `.env.local` and set
`EXECUTIVE_CAREER_OS_PATH` to the absolute Executive Career OS checkout path.

## Commands

```powershell
npm install
npm run dev
npm run lint
npm test
npm run typecheck
npm run build
```

The app consumes shared contracts from `../../packages/career-core`.
