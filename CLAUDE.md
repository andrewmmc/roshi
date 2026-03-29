# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint on .ts/.tsx files
npm run tauri:dev    # Run Tauri desktop app in dev mode
npm run tauri:build  # Build Tauri desktop app (macOS dmg+app)
```

No test runner is configured.

## Architecture

LLM Tester is a browser/desktop app for testing LLM provider APIs. It sends requests via fetch, streams responses with `eventsource-parser`, and persists data to IndexedDB via Dexie.js.

### Data flow

1. User composes in **request-store** (messages, params, headers)
2. `useSendRequest` hook validates and calls `llm-client.sendRequest()`
3. **Adapter** (`src/adapters/`) converts `NormalizedRequest` → provider-specific format, sends fetch, parses response back to `NormalizedResponse`
4. Stores update, history entry saved to IndexedDB
5. Components re-render via Zustand selectors

### Provider adapter pattern

`ProviderAdapter` interface in `src/adapters/types.ts` abstracts request/response handling per provider. Only `openai.ts` (OpenAI-compatible) is implemented. The `getAdapter()` factory in `src/adapters/index.ts` selects the adapter.

### State management

Four Zustand stores, no middleware:

- **provider-store** — Provider CRUD, selection (persisted to localStorage)
- **request-store** — Composer state, response/streaming state, loading flags
- **history-store** — History entries loaded from IndexedDB
- **theme-store** — Light/dark toggle (persisted to localStorage)

### Dev proxy

`src/dev/dev-proxy-plugin.ts` is a Vite middleware that proxies API requests through `/api/proxy?url=...` to bypass CORS in development. Production (Tauri) makes direct calls.

### Models source

Provider models are fetched from the external `models.dev` API, filtered by provider name.

## Key Conventions

- **Path alias:** `@/*` maps to `src/*` — use absolute imports, not relative
- **shadcn/ui v4:** Uses `@base-ui/react`, NOT Radix. No `asChild` prop — use `render` prop instead
- **Tailwind v4:** Config is inline in `src/index.css` using `@plugin`/`@theme` directives, no config file. Colors use `oklch()`.
- **TypeScript:** `erasableSyntaxOnly` is enabled — no parameter properties in constructors
- **react-resizable-panels v4:** Uses `orientation` prop, not `direction`
- **File naming:** kebab-case for files, PascalCase for components/types, UPPER_SNAKE_CASE for constants
- **Dark mode:** Class-based (`dark` on `<html>`), toggled via theme-store
- **No default exports** — use named exports everywhere
