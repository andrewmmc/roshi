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

- React 19, TypeScript, Vite 7
- shadcn/ui v4 (Base UI) + Tailwind CSS v4
- Zustand (state) + Dexie.js (IndexedDB storage)
- eventsource-parser (SSE streaming)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## License

MIT
