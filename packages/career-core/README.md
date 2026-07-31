# `@pro-flow/career-core`

Shared, runtime-agnostic contracts for the Pro-Flow Career OS integration.

This package defines:

- evidence provenance and verification states;
- the canonical candidate-profile shape;
- job opportunities and explainable fit assessments;
- generated application packages and factual reviews;
- workflow states and readiness checks;
- provider, storage, document, and job-source interfaces.

It deliberately contains no filesystem implementation, AI provider, user
interface, real candidate data, or provider credentials. Those capabilities
connect through the interfaces exported by `src/services.ts`.

## Commands

```powershell
npm test
npm run typecheck
```
