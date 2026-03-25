# LLM Tester - Implementation Plan

## Context

Build a Postman-like GUI client for testing LLM service APIs. The app lets users configure custom LLM providers, compose requests (messages, model, parameters), send them, and view responses in either a chat UI or raw JSON view. All data is stored locally. Built web-first with a clear path to a Mac desktop app via Tauri.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 19 + TypeScript + Vite | Best ecosystem, shadcn/ui support, Tauri path |
| UI Components | shadcn/ui (Radix primitives) + Tailwind CSS | Resizable panels, tabs, dialogs out of the box |
| State | Zustand | Minimal boilerplate, persistence middleware |
| Storage | Dexie.js (IndexedDB) | Structured data, live queries, no size limit |
| Streaming | fetch + ReadableStream + `eventsource-parser` | Standard APIs, lightweight |
| CORS | Vite dev proxy | Simplest for v1 local dev tool |
| Package manager | npm | User preference |
| Desktop (future) | Tauri | Small binary, native webview, bypasses CORS |

## Architecture

### Provider Adapter Pattern

Each provider type (openai-compatible, anthropic, google-gemini, custom) has an adapter that implements:

```
ProviderAdapter {
  buildRequestBody(normalized, provider) -> raw request JSON
  buildRequestHeaders(provider) -> headers
  buildRequestUrl(provider, model) -> URL
  parseResponse(raw) -> NormalizedResponse
  parseStreamChunk(line) -> NormalizedStreamChunk | null
}
```

V1 ships with `openai-compatible` adapter only. Custom providers use this as default. Anthropic and Google adapters added in a later phase.

### Provider Config (JSON, stored in IndexedDB)

```typescript
interface ProviderConfig {
  id: string;
  name: string;
  type: 'openai-compatible' | 'anthropic' | 'google-gemini' | 'custom';
  baseUrl: string;                    // e.g. "https://api.openai.com/v1"
  auth: {
    type: 'bearer' | 'api-key-header' | 'query-param' | 'none';
    headerName?: string;              // e.g. "x-api-key"
    valuePrefix?: string;             // e.g. "Bearer "
  };
  apiKey: string;
  endpoints: { chat: string };        // e.g. "/chat/completions"
  models: { id: string; name: string; displayName: string; maxTokens?: number; supportsStreaming: boolean }[];
  defaults?: { temperature?: number; maxTokens?: number };
  isBuiltIn: boolean;
}
```

Built-in templates (OpenAI, Anthropic, Google) are shipped as importable JSON files that users can add -- not auto-activated.

### Normalized Types

```typescript
interface NormalizedRequest {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  systemPrompt?: string;
}

interface NormalizedResponse {
  id: string; model: string; content: string; role: 'assistant';
  finishReason: string | null;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
}
```

### Database Schema (Dexie)

Three tables:
- **providers** -- `id, name, type, isBuiltIn` (provider configs with API keys)
- **history** -- `id, providerId, collectionId, createdAt` (every request/response pair, stores both raw and normalized)
- **collections** -- `id, parentId, sortOrder` (folders to group requests)

### Chat View vs Raw JSON Toggle

The response panel has two tabs:
- **Chat** -- renders `NormalizedResponse` as conversation bubbles with Markdown
- **Raw JSON** -- renders the exact API response payload in a JSON tree viewer

Both raw and normalized data are stored per request, so switching is instant.

### Streaming

Uses browser `fetch` with `response.body.getReader()` + `eventsource-parser` to parse SSE. Chat view shows text building up in real-time. Raw view shows accumulated data after stream completes.

## Project Structure

```
llm-tester/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                    # includes proxy config for CORS
├── tailwind.config.ts
├── components.json                   # shadcn/ui config
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # layout shell
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx         # resizable sidebar + main panel
│   │   │   ├── Sidebar.tsx           # history list + collections
│   │   │   └── MainPanel.tsx         # composer + response
│   │   ├── composer/
│   │   │   ├── RequestComposer.tsx   # main composer
│   │   │   ├── ProviderSelect.tsx    # provider + model dropdowns
│   │   │   ├── MessageEditor.tsx     # messages with role selector
│   │   │   ├── ParameterControls.tsx # temperature, max tokens
│   │   │   └── HeaderEditor.tsx      # custom headers
│   │   ├── response/
│   │   │   ├── ResponsePanel.tsx     # container with view toggle
│   │   │   ├── ChatView.tsx          # conversation display
│   │   │   ├── RawJsonView.tsx       # JSON tree viewer
│   │   │   └── StreamingIndicator.tsx
│   │   ├── providers/
│   │   │   ├── ProviderManager.tsx   # CRUD for providers
│   │   │   └── ProviderForm.tsx      # add/edit form
│   │   └── history/
│   │       ├── HistoryList.tsx
│   │       └── HistoryItem.tsx
│   ├── adapters/
│   │   ├── index.ts                  # getAdapter() factory
│   │   ├── types.ts                  # ProviderAdapter interface
│   │   └── openai.ts                 # OpenAI-compatible adapter (v1)
│   ├── services/
│   │   └── llm-client.ts            # fetch + streaming logic
│   ├── stores/
│   │   ├── request-store.ts
│   │   ├── provider-store.ts
│   │   └── history-store.ts
│   ├── db/
│   │   ├── index.ts                  # Dexie DB instance + schema
│   │   └── seed.ts                   # seed built-in templates
│   ├── types/
│   │   ├── provider.ts
│   │   ├── normalized.ts
│   │   └── history.ts
│   ├── providers/
│   │   └── builtins.ts              # template configs for import
│   ├── lib/
│   │   └── utils.ts                  # cn() helper
│   └── hooks/
│       ├── use-send-request.ts
│       ├── use-providers.ts
│       └── use-history.ts
└── src-tauri/                        # added later for desktop
```

## Implementation Phases

### Phase 1: Foundation + End-to-End Request
1. Scaffold: `npm create vite@latest` with react-ts template
2. Install and configure: Tailwind CSS, shadcn/ui, Zustand, Dexie, nanoid, eventsource-parser
3. Set up shadcn/ui components: resizable panels, tabs, button, input, select, dialog, textarea
4. Create `AppLayout` with resizable two-panel layout (sidebar + main)
5. Define types: `provider.ts`, `normalized.ts`, `history.ts`
6. Create Dexie DB schema (`db/index.ts`)
7. Implement `ProviderAdapter` interface and `openai.ts` adapter
8. Build minimal `RequestComposer` -- textarea + send button
9. Wire up `llm-client.ts` with Vite proxy, get a response back
10. Display raw JSON response

### Phase 2: Full UI + Streaming
1. Build `ProviderSelect` (provider + model dropdowns)
2. Build `MessageEditor` -- multiple messages with role selection
3. Build `ParameterControls` (temperature, max tokens)
4. Build `ResponsePanel` with Chat/Raw JSON tabs
5. Implement `ChatView` with Markdown rendering (react-markdown)
6. Implement streaming via ReadableStream + eventsource-parser
7. Real-time streaming display in ChatView
8. Loading/error states

### Phase 3: Provider Management + History
1. Build `ProviderManager` -- add/edit/delete custom providers
2. Build `ProviderForm` with all config fields
3. Ship built-in provider templates as importable JSON
4. Save request/response pairs to Dexie on every send
5. Build `HistoryList` in sidebar
6. Click history item to reload request + response
7. Add `HeaderEditor` for custom headers per request

### Phase 4: Collections + Polish (future)
- Folder/group organization for requests
- Drag-and-drop, rename, duplicate, delete
- Keyboard shortcuts (Cmd+Enter to send)
- Dark mode
- Request timing + token usage display

### Phase 5: Desktop via Tauri — DONE
- Tauri v2 wraps the web app as a native macOS desktop app
- CORS is bypassed natively in the desktop webview — no proxy needed
- Browser `fetch()` works as-is in Tauri's WebKit webview
- CSP configured with permissive `connect-src` for arbitrary LLM API endpoints
- Builds `.app` bundle and `.dmg` installer for macOS

#### Building the macOS Desktop App

**Prerequisites:**
- [Rust toolchain](https://rustup.rs/): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Xcode Command Line Tools: `xcode-select --install`

**Development:**
```bash
npm run tauri:dev
```
Launches the desktop app with hot-reload. The Vite dev server runs in the background.

**Production build:**
```bash
npm run tauri:build
```
Produces:
- `src-tauri/target/release/bundle/macos/LLM Tester.app`
- `src-tauri/target/release/bundle/dmg/LLM Tester_0.1.0_aarch64.dmg`

**Web-only development** (no Tauri, as before):
```bash
npm run dev
```

## Verification

After each phase:
1. **Phase 1:** Type a message, send to an OpenAI-compatible endpoint via Vite proxy, see raw JSON response
2. **Phase 2:** Compose multi-message request, stream response, toggle between chat and raw view
3. **Phase 3:** Create a custom provider, send request through it, see it in history, reload from history
4. **Phase 5:** `npm run tauri:dev` launches the desktop app, API requests work without CORS errors

Run `npm run dev` for web or `npm run tauri:dev` for desktop and test against a real LLM API.
