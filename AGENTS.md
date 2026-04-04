# Roshi — agent guide

Single source of truth for AI coding assistants (Cursor, Claude Code, Codex, and similar).

## Cursor Cloud specific instructions

For **Cursor Cloud**, use the same guidance as the rest of this file: [What this project is](#what-this-project-is), [Commands](#commands), [Architecture](#architecture), [Conventions](#conventions), and [Notes for agents](#notes-for-agents). No separate Cursor-only setup, env files, or backend is required.

## What this project is

**Roshi** is a client-only React + TypeScript + Vite SPA — a Postman-like UI for calling LLM provider APIs. There is no backend service, no server database, and no Docker. Data lives in the browser (IndexedDB via Dexie.js for providers/history/settings; **localStorage** for theme preference).

## Commands

| Action                   | Command                                                |
| ------------------------ | ------------------------------------------------------ |
| Install dependencies     | `npm install`                                          |
| Dev server               | `npm run dev` — Vite on port 5173 (`--host` enabled)   |
| Lint                     | `npm run lint`                                         |
| Typecheck only           | `npm run typecheck` — `tsc -b`                         |
| Format (write)           | `npm run format` — Prettier                            |
| Format (check)           | `npm run format:check`                                 |
| Production build         | `npm run build` — `tsc -b && vite build`               |
| Preview production build | `npm run preview`                                      |
| Tests (single run)       | `npm run test` — Vitest + jsdom                        |
| Tests (watch)            | `npm run test:watch`                                   |
| Test coverage            | `npm run test:coverage` — V8 provider + thresholds     |
| Tauri (desktop) dev      | `npm run tauri:dev`                                    |
| Tauri (desktop) build    | `npm run tauri:build` — platform packages (e.g. macOS) |

**Pre-commit:** [Lefthook](https://github.com/evilmartians/lefthook) runs lint, typecheck, and format check in parallel (`lefthook.yml`). Run `npx lefthook install` after clone if hooks are not active.

Validate non-trivial changes with `npm run test`, `npm run build`, and `npm run lint`.

## Architecture

The app sends HTTP requests with `fetch`, streams SSE with `eventsource-parser`, and persists history and settings to IndexedDB.

### Data flow

1. User edits the **composer** (`composer-store`: messages, parameters, custom headers).
2. `useSendRequest` validates input and calls `llm-client.sendRequest()`.
3. The **adapter** (`src/adapters/`) maps `NormalizedRequest` to the provider’s wire format, runs `fetch`, and parses the response into `NormalizedResponse` / stream chunks.
4. **response-store** holds loading, streaming text, errors, and raw request/response payloads.
5. A **history** entry is written to IndexedDB; UI updates via Zustand selectors.

`request-store.ts` is a thin re-export of `composer-store` and `response-store` for backward compatibility; prefer importing those stores directly.

### Provider adapters

`ProviderAdapter` is defined in `src/adapters/types.ts`. `getAdapter()` in `src/adapters/index.ts` picks the implementation by `ProviderConfig.type`:

- **`openai-compatible`** and **`custom`** → `openaiAdapter` (Chat Completions–style JSON).
- **`anthropic`** → `anthropicAdapter` (Anthropic Messages API).
- **`google-gemini`** → currently the same as OpenAI-compatible (fallback until a dedicated adapter exists).

### State (Zustand, no middleware)

- **provider-store** — providers, API keys, models, selection (providers in IndexedDB; selection in IndexedDB `settings`).
- **composer-store** — composer payload (messages, temperature, tokens, headers, etc.).
- **response-store** — last run: streaming buffer, parsed response, errors, raw JSON.
- **history-store** — history list from IndexedDB.
- **theme-store** — light/dark; preference persisted in **localStorage** (`llm-tester-theme`).

### Dev proxy

`src/dev/dev-proxy-plugin.ts` exposes `/api/proxy?url=...` so the Vite dev server can forward requests and ease CORS during development. The packaged Tauri app calls provider URLs directly. Treat `/api/proxy` as optional dev tooling, not a required part of v1 behavior.

### Models list

Built-in provider models are loaded from the external **models.dev** API, filtered by provider name.

### Built-in provider templates

Seeded from `src/providers/builtins.ts`: OpenAI, Anthropic, OpenRouter (see that file for base URLs and auth). Users can add more providers in the UI.

## Conventions

- **Imports:** path alias `@/*` → `src/*` (see `vite.config.ts`, `tsconfig.app.json`). Prefer `@/…` over deep relative paths.
- **shadcn/ui v4:** built on `@base-ui/react`, not Radix. There is no `asChild` — use the `render` prop where needed.
- **Tailwind v4:** theme and plugins live in `src/index.css` (`@plugin`, `@theme`). Colors use `oklch()`.
- **TypeScript:** `erasableSyntaxOnly` is on — no parameter properties in constructors.
- **react-resizable-panels v4:** use `orientation`, not `direction`.
- **Files:** kebab-case filenames; PascalCase components/types; `UPPER_SNAKE_CASE` constants.
- **Dark mode:** `dark` class on `<html>`, driven by `theme-store`.
- **Exports:** named exports only (no default exports) unless an ecosystem tool requires otherwise.

## Notes for agents

- Vitest tests live next to source (`src/**/*.test.ts` per `vitest.config.ts`). Coverage thresholds are enforced when running `test:coverage` (85% lines/functions/statements, 80% branches).
- ESLint may report pre-existing issues (e.g. unused variables, conditional hooks in `CodeView.tsx`, react-refresh noise in generated UI). Do not assume new edits caused all warnings.
- Users enter API keys in the UI; secrets are stored locally in IndexedDB. No `.env` or server-side secrets are required for the app to run.
- **After non-trivial changes, always run all three validation commands before considering the task complete:**
  ```bash
  npm run typecheck
  npm run test
  npm run lint
  ```
