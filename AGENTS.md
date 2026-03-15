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

### Notes

- **No automated tests** exist in this repo (no test framework configured). Validate changes via `npm run build` (TypeScript + Vite) and `npm run lint` (ESLint).
- ESLint has pre-existing errors (unused vars, conditional hooks in `CodeView.tsx`, react-refresh warnings in shadcn UI files). These are not caused by your changes.
- The app is fully client-side; API keys are entered by users in the browser UI and stored in IndexedDB. No `.env` files or server-side secrets are needed.
- The Vite dev server proxy at `/api/proxy` is a placeholder for CORS support and is not actively used in v1.
- Path alias `@` maps to `./src` (configured in `vite.config.ts` and `tsconfig.app.json`).
