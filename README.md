<p align="center">
  <img src="./assets/roshi-logo.png" alt="Roshi logo" width="128" />
</p>

<h1 align="center">Roshi</h1>

<p align="center">
  <strong>A local-first macOS API client and model evaluation workbench for LLM developers.</strong>
</p>

<p align="center">
  Send LLM requests, inspect responses, compare models, and evaluate output—all from your Mac.
</p>

<p align="center">
  <a href="https://github.com/andrewmmc/roshi/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/andrewmmc/roshi/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://github.com/andrewmmc/roshi/releases/latest">
    <img alt="Latest release" src="https://img.shields.io/github/v/release/andrewmmc/roshi?display_name=release" />
  </a>
  <a href="./LICENSE">
    <img alt="License: MIT" src="https://img.shields.io/github/license/andrewmmc/roshi" />
  </a>
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/roshi-llm-api-workbench/id6761768847"><strong>Mac App Store</strong></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/andrewmmc/roshi/releases/latest"><strong>Free download</strong></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://roshi.mmc.dev"><strong>Website</strong></a>
</p>

## Overview

Roshi is a Postman-like desktop client built specifically for LLM APIs. It understands multi-turn messages, streaming, model parameters, token usage, provider-specific payloads, and model comparisons.

Use Roshi with OpenAI, Anthropic, Google Gemini, OpenRouter, or any OpenAI-compatible endpoint. Build a request once, inspect exactly what was sent and returned, then compare the same prompt across models by quality, latency, token usage, and cost.

| Area              | Details                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Providers         | OpenAI, Anthropic, Google Gemini, OpenRouter, and OpenAI-compatible APIs                     |
| Core workflow     | Compose → send → inspect → compare → evaluate                                                |
| Data storage      | Local IndexedDB; no Roshi backend, account, telemetry, or hosted key storage                 |
| Desktop platforms | macOS on Apple Silicon and Intel                                                             |
| Model evaluation  | Side-by-side runs, manual ratings, LLM-as-judge scoring, response diffs, and CSV/JSON export |

## Workflow

1. **Add a provider.** Choose a built-in template or configure a compatible endpoint.
2. **Compose a request.** Add messages, images, model parameters, and custom headers.
3. **Inspect the result.** Review streamed text, raw payloads, timing, and token usage.
4. **Compare and evaluate.** Run the request across models, apply your rubric, and save or export the results.

## Screenshots

These are current views from the shipping app.

<p align="center">
  <img src="./assets/screenshot-1.png" alt="Roshi composer showing a multi-turn OpenAI request and its raw JSON response" width="92%" />
</p>
<p align="center">
  <strong>Compose, send, and inspect in one workspace</strong><br />
  Build multi-turn requests, tune parameters and headers, stream the answer, and inspect the complete request or response body.
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="./assets/screenshot-2.png" alt="Roshi provider settings listing OpenAI, Anthropic, Google Gemini, and OpenRouter" />
      <p>
        <strong>Bring your existing providers</strong><br />
        Start with templates for OpenAI, Anthropic, Google Gemini, and OpenRouter, then choose the models you want available.
      </p>
    </td>
    <td width="50%" valign="top">
      <img src="./assets/screenshot-3.png" alt="Roshi provider editor showing API key, base URL, protocol, authentication, and custom headers" />
      <p>
        <strong>Configure compatible endpoints</strong><br />
        Control the base URL, protocol, authentication, custom headers, and model list. Credentials are stored locally.
      </p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="./assets/screenshot-4.png" alt="Roshi Eval results comparing OpenAI, Anthropic, and Google Gemini outputs and metrics" />
      <p>
        <strong>Run one prompt across several models</strong><br />
        Compare output, latency, time to first token, throughput, token counts, estimated cost, ratings, and judge scores.
      </p>
    </td>
    <td width="50%" valign="top">
      <img src="./assets/screenshot-5.png" alt="Roshi Eval comparison showing a word-level diff and metrics for two model responses" />
      <p>
        <strong>Inspect differences, not just answers</strong><br />
        Select two results for a word-level diff and a direct comparison of performance and usage metrics.
      </p>
    </td>
  </tr>
</table>

<p align="center">
  <img src="./assets/screenshot-6.png" alt="Roshi LLM-as-judge settings with a selected judge model, custom rubric, and scored Eval results" width="92%" />
</p>
<p align="center">
  <strong>Apply your own evaluation rubric</strong><br />
  Choose a separate judge model to score candidates for qualities such as helpfulness, accuracy, and clarity, and select a winner.
</p>

## Install

Roshi supports macOS on Apple Silicon (M1+) and Intel.

| Option                                                                                  | Best for                                     |
| --------------------------------------------------------------------------------------- | -------------------------------------------- |
| **[Mac App Store](https://apps.apple.com/us/app/roshi-llm-api-workbench/id6761768847)** | Automatic updates and supporting development |
| **[GitHub release](https://github.com/andrewmmc/roshi/releases/latest)**                | Free manual installation                     |

To install a GitHub release:

1. Download the `.dmg` for your Mac from the [latest release](https://github.com/andrewmmc/roshi/releases/latest).
2. Open it and drag **Roshi** to **Applications**.
3. If macOS blocks the first launch, open **System Settings → Privacy & Security** and select **Open Anyway**.
4. Add a provider API key and start testing.

> The browser build is intended for development. It only works with CORS-enabled providers; use the desktop app for full provider compatibility.

## Features

### Build and debug requests

- Multi-turn conversations with system prompts, image attachments, sampling parameters, and custom headers
- Real-time SSE streaming with raw request and response inspection
- Token usage, latency, time-to-first-token, throughput, and estimated cost metrics
- Python and Node.js snippets for supported OpenAI-compatible requests

### Organize your work

- Model catalog powered by [models.dev](https://models.dev)
- Up to eight independent request tabs
- Searchable local history with filtering and response diffs
- Reusable collections and saved requests
- Named environments with `{{var}}` substitution
- `⌘K` command palette and light/dark themes

### Compare models

- Side-by-side runs across multiple providers and models
- Manual ratings and custom LLM-as-judge rubrics
- Word-level response diffs and direct metric comparisons
- Saved eval runs with CSV and JSON export

## Privacy and security

Roshi is open source under the [MIT License](LICENSE). It has no backend, account system, telemetry, or hosted dependency. The desktop app calls provider APIs directly, and [CI](https://github.com/andrewmmc/roshi/actions/workflows/ci.yml) checks formatting, linting, tests, and production builds.

API keys are stored **unencrypted** in local IndexedDB:

- **Desktop (recommended for real keys):** keys are sent directly to the selected provider, never through Roshi infrastructure. The Tauri app uses a restrictive Content Security Policy.
- **Web or self-hosted:** an XSS vulnerability on the hosting origin could read stored keys. Use the browser build for development and testing, not for production secrets.

## Development

> Looking to use Roshi? [Install the desktop app](#install). This section is for contributors.

### Prerequisites

- Node.js 26+
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri desktop builds)

### Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

The dev server includes a CORS proxy at `/api/proxy`. Production web builds do not, so providers that block browser requests will fail there. Use the Tauri desktop app for full provider compatibility.

### Commands

```bash
npm run build        # Production build
npm run test         # Unit and integration tests
npm run test:e2e     # Playwright end-to-end tests
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format       # Prettier
npm run tauri:dev    # Desktop app in development
npm run tauri:build  # Desktop release build
```

### Tech stack

React 19 · TypeScript · Vite 7 · Tailwind CSS v4 · shadcn/ui v4 · Zustand · Dexie.js · Tauri 2 · Vitest · Playwright

See [AGENTS.md](./AGENTS.md) for architecture, conventions, and contributor documentation.

## Contributing

Issues and pull requests are welcome. To suggest a feature or report a bug, [open an issue](https://github.com/andrewmmc/roshi/issues) with enough detail to reproduce the behavior.

## Author

Created by **Andrew Mok** ([@andrewmmc](https://github.com/andrewmmc))

## Disclaimer

Roshi is not affiliated with, endorsed by, or sponsored by Postman, Inc. “Postman” is a trademark of Postman, Inc. References to Postman are descriptive only.

## License

[MIT License](LICENSE).
