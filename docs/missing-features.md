# Missing and partial features (LLM Tester)

Snapshot of gaps relative to `PLAN.md`, `README.md`, and the current codebase.

## Already in good shape

Core loop is covered: OpenAI-compatible providers, streaming, chat/raw/code views, local history, provider management, themes, and response metadata (timing, HTTP status, token usage when the API returns it). Per-request custom headers are applied on send.

## From the implementation plan (not done or only stubbed)

1. **Collections / folders** — Dexie defines `collections` and `collectionId` on history, but there is no UI to manage folders or assign history items.

2. **Native Anthropic / Google adapters** — `getAdapter` uses the OpenAI-compatible adapter for `anthropic` and `google-gemini`. That only works when the endpoint actually uses that wire format.

3. **Desktop (Tauri)** — Phase 5 in the plan; not present in the repo.

4. **CORS** — Vite’s `/api/proxy` is described as a placeholder, not a full working proxy for browser CORS.

5. **Phase 4 polish** — Examples: Cmd+Enter to send, drag-and-drop, rename/duplicate history items (called out as future in `PLAN.md`).

## Code-level gaps

6. **Custom headers vs history** — Headers are sent with the request but are not stored on history entries and are not restored when loading from history. Reopened runs may not match the original request unless inferred from stored raw JSON.

7. **Limited request surface** — Composer models mainly messages, temperature, max tokens, and stream. Many APIs expose top_p, stop sequences, JSON mode, tools/function calling, seeds, provider-specific options, etc.

8. **Multimodal** — Message content is plain text only (no images or attachments in the normalized model).

9. **History UX** — No search/filter (by text, provider, model, date) or export/import of history/providers.

10. **Tests** — `AGENTS.md` notes no automated test framework; validation is manual plus lint/build.

11. **API key storage** — Keys live in IndexedDB in the browser; fine for a local tool, but not encrypted—worth documenting for users who care about threat models.

## Suggested priority (opinion)

1. Persist and restore **custom headers** with history (small change, high fidelity when revisiting requests).
2. Address **CORS** (real proxy or desktop) vs **native adapters**, depending on whether users hit browser CORS or wrong API formats first.
3. **Collections + search** for heavier day-to-day use.
