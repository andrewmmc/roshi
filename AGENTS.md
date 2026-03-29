# AGENTS.md

## Cursor Cloud specific instructions

This is a single-service React + TypeScript + Vite SPA (**LLM Tester** — a Postman-like GUI for testing LLM APIs). No backend, no database, no Docker.

### Quick reference

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (Vite on port 5173, `--host` enabled) |
| Lint | `npm run lint` |
| Build | `npm run build` (`tsc -b && vite build`) |
| Preview prod build | `npm run preview` |
| Test | `npm run test` (Vitest, single run) |
| Test (watch) | `npm run test:watch` |
| Test (coverage) | `npm run test:coverage` (V8 provider) |

### Notes

- **Tests** use Vitest with jsdom. Test files live alongside source code (`src/**/*.test.ts`). Coverage thresholds are enforced (85% lines/functions/statements, 80% branches). Validate changes via `npm run test`, `npm run build`, and `npm run lint`.
- ESLint has pre-existing errors (unused vars, conditional hooks in `CodeView.tsx`, react-refresh warnings in shadcn UI files). These are not caused by your changes.
- The app is fully client-side; API keys are entered by users in the browser UI and stored in IndexedDB. No `.env` files or server-side secrets are needed.
- The Vite dev server proxy at `/api/proxy` is a placeholder for CORS support and is not actively used in v1.
- Path alias `@` maps to `./src` (configured in `vite.config.ts` and `tsconfig.app.json`).
