# LLM Tester

A web-based tool for testing and comparing LLM API responses. Send requests to any OpenAI-compatible API endpoint, stream responses in real-time, and keep a local history of all interactions.

## Features

- **Multi-provider support** — built-in templates for OpenAI, Anthropic, Google, and OpenRouter (any OpenAI-compatible endpoint works)
- **Real-time streaming** — see responses as they arrive via SSE
- **Request history** — all requests and responses stored locally in IndexedDB
- **Provider management** — save and switch between multiple provider configurations
- **Dark mode** — system-aware with manual toggle
- **Fully client-side** — no backend required, API keys stay in your browser

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 7
- **UI:** shadcn/ui v4 (Base UI) + Tailwind CSS v4
- **State:** Zustand + Dexie.js (IndexedDB storage)
- **Streaming:** eventsource-parser (SSE)
- **Testing:** Vitest (183 tests, 97.46% coverage)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Development

```bash
# Run tests (Vitest, 183 tests, 97.46% coverage)
npm test

# Watch mode
npm test:watch

# Coverage report
npm run test:coverage

# Lint code
npm run lint
```

## License

MIT
