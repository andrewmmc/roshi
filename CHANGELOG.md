# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-30

### ✨ Initial v1 Release

Roshi ships as a fully functional, client-side web app for testing LLM provider APIs with real-time streaming, local history, and multi-provider support.

### 🎯 Core Features

#### Multi-Provider Support

- **Built-in provider templates** — OpenAI, Anthropic (Messages API), Google Gemini, OpenRouter
- **Custom providers** — add any OpenAI-compatible endpoint
- **Provider management** — save multiple configurations; selection persisted in IndexedDB
- **Per-provider adapters** — normalized request/response handling with provider-specific wire format

#### Real-time API Testing

- **Live streaming** — SSE responses via `eventsource-parser`
- **Chat interface** — multi-turn conversations with role-based message composer
- **Request composer** — temperature, top-p, frequency penalty, presence penalty, max tokens, custom headers, system prompt, image attachments (for vision models)
- **Response viewer** — streaming buffer, raw JSON, error details
- **Code snippet generation** — auto-generated cURL, Python, JavaScript snippets for active request

#### Local History & Persistence

- **Request history** — all interactions stored locally in IndexedDB (Dexie.js)
- **History search** — search by query or filter by status
- **History restore** — load past requests and responses
- **No backend required** — fully client-side; API keys stay in the browser

#### Developer Experience

- **Token count estimation** — see token usage before sending (via `gpt-tokenizer`)
- **Dark mode** — light/dark theme toggle; preference saved in localStorage
- **Error boundaries** — per-panel error handling for Sidebar, Composer, and Response panel
- **Confirmation dialogs** — prevent accidental loss of unsent composer work

#### Advanced Capabilities

- **Image attachment support** — send images to vision models (base64 encoded)
- **Endpoint override** — customize chat endpoint URL per provider
- **Advanced parameters** — OpenAI-specific params (frequency penalty, top-p, etc.)
- **Request timeout** — 120-second timeout with combined abort signals
- **Anthropic thinking** — support for extended thinking on Anthropic models
- **Top-k support** — available for Anthropic adapter

#### Desktop App (Tauri)

- **Native wrapper** — macOS, Windows, Linux builds via Tauri
- **Direct API calls** — desktop app bypasses dev proxy for direct provider requests
- **App icons** — configured with Tauri bundle settings

### 🛠️ Tech Stack

- **Frontend** — React 19, TypeScript, Vite 7
- **UI** — shadcn/ui v4 (Base UI) + Tailwind CSS v4
- **State** — Zustand (stores: provider, composer, response, history, theme)
- **Persistence** — Dexie.js (IndexedDB) + localStorage
- **Streaming** — `eventsource-parser` (SSE)
- **Testing** — Vitest + jsdom; 91.77% code coverage
- **CI** — GitHub Actions (lint, tests, build on push/PR)

### 📋 What's Included

✅ **290+ tests** (100% pass rate)
✅ **Clean lint & typecheck** (zero warnings)
✅ **91.77% test coverage** (exceeds thresholds: 85% lines/functions/statements, 80% branches)
✅ **Pre-commit hooks** via Lefthook
✅ **SEO meta tags** (description, OG tags for link previews)
✅ **MIT License**

### 🚀 Getting Started

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

Desktop (Tauri):

```bash
npm run tauri:dev    # dev build
npm run tauri:build  # platform-specific bundle
```

### 📝 Known Limitations

- **Main JS chunk** (~2 MB) — not code-split; `gpt-tokenizer` and `react-markdown` are bundled

### 📄 License

[MIT License](LICENSE).

---

## Future Roadmap (Post-v1)

- Code-splitting for `gpt-tokenizer` and `react-markdown`
- Collections/folders for organizing requests
- GitHub release workflow for Tauri builds
- Keyboard shortcuts (Cmd+Enter to send)
- Format check in CI pipeline
