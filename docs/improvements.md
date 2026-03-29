# Potential Improvements — LLM Tester

Comprehensive audit of the codebase as of March 2026. Organized by category and priority.

---

## 1. Missing Features (High Impact)

### 1.1 Native Anthropic Adapter

`getAdapter()` in `src/adapters/index.ts` falls back to the OpenAI adapter for `anthropic` and `google-gemini` types. Anthropic's `/messages` API uses a different wire format (`system` as a top-level field, `max_tokens` is required, different streaming format). The Anthropic built-in provider is commented out in `builtins.ts` because of this.

**Recommendation:** Implement `src/adapters/anthropic.ts` with proper request/response mapping, then re-enable the Anthropic provider in `builtins.ts`.

### 1.2 Native Google Gemini Adapter

Same issue — Google Gemini uses `/v1beta/models/{model}:generateContent` with a completely different schema (`contents` instead of `messages`, `generationConfig` instead of flat params). Without a dedicated adapter, selecting `google-gemini` as provider type silently sends the wrong format.

### 1.3 Collections / Folders

The Dexie schema defines `collections` table and `collectionId` on `HistoryEntry`, but there is zero UI for creating, managing, or assigning collections. This was planned for Phase 4.

**Recommendation:** Build `CollectionManager` + `CollectionTree` components, add drag-and-drop to assign history items to folders.

### 1.4 History Search & Filtering

No way to search or filter history entries by text, provider, model, date range, or status (success/error). For power users with hundreds of entries, the flat list becomes unusable.

**Recommendation:** Add a search input above the history list with text matching on message content, provider name, model ID. Optional filters for date range and error/success status.

### 1.5 Export / Import

No way to export or import providers or history. Users cannot share configurations, back up data, or migrate between browsers/machines.

**Recommendation:** Add export/import buttons for both providers (JSON) and history (JSON/CSV).

### 1.6 Request Duplication

No "duplicate" or "re-send" button on history items. Users must manually reconstruct requests.

---

## 2. Architecture & Code Quality

### 2.1 Request Store is Overloaded

`request-store.ts` (204 lines) mixes request composition state (messages, params) with response state (loading, streaming, response, error, duration) and response-related actions. This makes it hard to reason about and creates tight coupling.

**Recommendation:** Split into `composer-store.ts` (request composition) and `response-store.ts` (response/streaming state). Or at minimum, group the state and actions more clearly with comments.

### 2.2 `loadFromHistory` Doesn't Restore All Parameters

`loadFromHistory` in `request-store.ts` does not restore `topP`, `frequencyPenalty`, or `presencePenalty` from history. These are stored in the `HistoryEntry.request` but silently dropped on reload, so revisited requests may not match the original.

**File:** `src/stores/request-store.ts` lines 175-203  
**File:** `src/components/history/HistoryList.tsx` lines 26-43

### 2.3 `useSendRequest` Rebuilds Request Object Twice

In `use-send-request.ts`, the `NormalizedRequest` object is built once for `setSentRequest()` (line 78-88) and again for `sendRequest()` (line 121-131). This duplication risks drift.

**Recommendation:** Build the request object once and reuse it for both calls.

### 2.4 Provider Selection Persistence Uses localStorage + IndexedDB

Provider configs live in IndexedDB (Dexie) while the selected provider/model IDs are persisted in `localStorage` via `SELECTION_KEY`. This creates a split-brain risk — the localStorage selection can reference a deleted provider ID.

**Recommendation:** Either persist selection in Dexie alongside providers, or add more robust validation on load (currently partial — stale references are cleared but the logic is fragile).

### 2.5 `ProviderForm` Uses Array Index as React Key for Models

In `ProviderForm.tsx` line 208, model items use `key={i}` (array index) instead of a stable ID. This causes subtle bugs when reordering or deleting models mid-list (wrong model gets removed, input state bleeds between items).

**Recommendation:** Add an `id` field to models in the form state and use it as the key.

### 2.6 No Error Boundary per Panel

The app has a single top-level `ErrorBoundary`. If the response panel throws (e.g., malformed markdown in `ChatView`), the entire app crashes. The sidebar and composer remain usable — only the failing panel should show an error.

**Recommendation:** Wrap `ResponsePanel`, `RequestComposer`, and `Sidebar` individually in `ErrorBoundary`.

### 2.7 Codegen Doesn't Include Code Tab for Anthropic/Gemini

`getCodeGenerators()` returns `[]` for non-OpenAI types. Even when native adapters are added, users won't get code snippets unless codegen is extended.

**Recommendation:** Add `anthropic-python.ts` and `anthropic-node.ts` code generators alongside the adapter work.

---

## 3. UX / UI Improvements

### 3.1 No Keyboard Shortcut for Cancel

`Cmd+Enter` sends a request (implemented in `MainPanel.tsx`), but there's no keyboard shortcut to cancel/stop a running request (e.g., `Escape`).

### 3.2 No Auto-Scroll During Streaming

`ChatView` doesn't auto-scroll to the bottom as streaming content arrives. Users must manually scroll to follow the response.

**Recommendation:** Add a `useEffect` that scrolls to bottom when `streamingContent` changes, with a "stick to bottom" behavior that disables when the user scrolls up.

### 3.3 System Prompt Not Visible in Chat View When Set

The system prompt only renders in `ChatView` if `sentRequest?.systemPrompt` is truthy — meaning it's only shown after sending. While composing, there's no visual indication in the messages tab that a system prompt is configured.

**Recommendation:** Add a small badge or indicator on the "System Prompt" tab or in the messages tab header when a system prompt is set.

### 3.4 No Confirmation Before Losing Unsent Work

Clicking "New request" (`reset`) or clicking a history item immediately overwrites the current composer state with no confirmation. If the user has typed a long message they haven't sent, it's lost.

**Recommendation:** Show a confirmation dialog if the composer has unsent content.

### 3.5 Provider Select Dropdown is Too Narrow

The model dropdown is 200px (`w-[200px]`), which truncates long model names like `anthropic/claude-3.5-sonnet:beta`. The display name is used, but many models still have long IDs.

**Recommendation:** Make the dropdown wider or add a tooltip on hover showing the full name.

### 3.6 Theme Toggle Doesn't Support "System" Preference

The theme store only supports `light` and `dark`, defaulting to `light`. It doesn't respect `prefers-color-scheme` as a third "system" option, despite the README claiming "system-aware with manual toggle."

**Recommendation:** Add a `system` theme option that uses `matchMedia('(prefers-color-scheme: dark)')` and listens for changes.

### 3.7 No Token Count Before Sending

Users can't see an estimated token count for their request before sending. This is useful for cost estimation and staying within context limits.

### 3.8 No Response Copy Button in Chat View

`RawJsonView` and `CodeView` have copy buttons, but `ChatView` has no easy way to copy the assistant's response text.

### 3.9 Attachment Support is PDF-Only

`MessageEditor.tsx` line 165 restricts file uploads to `.pdf,application/pdf`. Image attachments (common for vision models) are not supported. The URL attachment also assumes PDF (`mimeType: 'application/pdf'` on line 83).

**Recommendation:** Support image types (`.png, .jpg, .gif, .webp`) and detect MIME type from the file/URL.

---

## 4. Performance

### 4.1 All History Loaded Into Memory at Once

`history-store.ts` loads all history entries into a single array via `db.history.orderBy('createdAt').reverse().toArray()`. For users with thousands of entries, this can be slow and memory-heavy.

**Recommendation:** Implement pagination or virtual scrolling. Load only the most recent N entries, with "load more" or infinite scroll.

### 4.2 `ProviderSelect` Calls `getSelectedProvider()` and `getSelectedModel()` on Every Render

These are store methods that do `find()` on the providers array. Not expensive with a few providers, but the pattern of calling store methods inside render rather than deriving via selectors adds unnecessary work.

### 4.3 Models API Fetched During Provider Seeding

`fetchModelsForProvider` hits `https://models.dev/api.json` for every built-in provider on first load. If the network is slow or the API is down, the initial load hangs. The `try/catch` falls back to empty models, but the user gets no feedback.

**Recommendation:** Show a loading state during initial seed. Cache the models API response (e.g., in localStorage with a TTL).

### 4.4 CodeView Regenerates All Code Snippets on Any Input Change

`codeMap` in `CodeView.tsx` recomputes code for all generators whenever any form field changes (messages, temperature, etc.), even if the user is on a different tab. This is fast now with 2 generators, but won't scale.

**Recommendation:** Only generate code for the active tab, or memoize per-generator.

---

## 5. Testing

### 5.1 No Component/Integration Tests

Test coverage only covers stores, hooks, adapters, and services (unit tests). There are zero React component tests — no rendering tests for `ChatView`, `ResponsePanel`, `ProviderForm`, etc.

**Recommendation:** Add `@testing-library/react` tests for critical UI paths: sending a request, loading from history, provider management dialog flow.

### 5.2 Test Coverage Excludes Key Areas

`vitest.config.ts` coverage excludes `src/dev/**`, `src/db/index.ts`, `src/types/**`. The dev proxy plugin has no tests — it handles real HTTP proxying logic with edge cases.

### 5.3 No E2E Tests

No Playwright or Cypress tests exist. For a tool that makes real API calls, E2E tests with mocked endpoints would catch integration issues.

---

## 6. Developer Experience

### 6.1 ESLint Has Pre-existing Errors

Per `AGENTS.md`, ESLint has known errors (unused vars, conditional hooks in `CodeView.tsx`, react-refresh warnings). These should be fixed or suppressed with targeted `eslint-disable` comments so that `npm run lint` runs clean.

### 6.2 No Prettier / Formatting Config

No `.prettierrc` or formatting tool is configured. Code style is inconsistent between files (some use single quotes, some double; some have trailing commas, some don't; inconsistent spacing in JSX).

**Recommendation:** Add Prettier with a config file and format the codebase.

### 6.3 `AGENTS.md` Says "No Tests" But Tests Exist

`AGENTS.md` states "No automated tests exist in this repo," but `vitest.config.ts` is configured and `README.md` claims 183 tests with 97.46% coverage. The `AGENTS.md` is outdated.

### 6.4 `README.md` Test Count May Be Stale

README hardcodes "183 tests, 97.46% coverage" in two places. This will become stale as tests are added/removed.

**Recommendation:** Remove hardcoded counts or add a CI badge.

---

## 7. Security & Reliability

### 7.1 API Keys Stored Unencrypted in IndexedDB

API keys are stored as plaintext in IndexedDB. While acceptable for a local-first tool, this should be documented as a known limitation. Any browser extension or XSS vulnerability could read them.

**Recommendation:** Document the threat model in README. For Tauri builds, consider using the OS keychain via `tauri-plugin-stronghold` or similar.

### 7.2 Dev Proxy Has No Rate Limiting or Size Limits

`dev-proxy-plugin.ts` proxies any URL without rate limiting, request size limits, or timeout. A malicious or misconfigured request could tie up the dev server.

### 7.3 No Request Timeout

`sendRequest` in `llm-client.ts` has no timeout — a stalled connection will hang indefinitely until the user manually cancels. The only timeout mechanism is the user clicking "Stop."

**Recommendation:** Add a configurable timeout (e.g., 120s default) to the fetch call via `AbortSignal.timeout()`.

### 7.4 Streamed Responses Accumulate Unbounded

`handleStream` in `llm-client.ts` accumulates `fullContent` and `allChunks` without any size limit. A malicious or buggy API that streams forever will consume unbounded memory.

---

## 8. Accessibility

### 8.1 No ARIA Labels on Icon-Only Buttons

Many icon-only buttons (theme toggle, new request, delete, attach) lack `aria-label`. They have `title` attributes but screen readers need `aria-label` or `aria-labelledby`.

### 8.2 No Focus Management in Dialogs

The provider manager dialog uses `modal={false}` which means focus is not trapped. Users navigating with keyboard can tab behind the dialog.

### 8.3 Chat View Role Labels Are Abbreviated

`ChatView` shows "you", "ai", "sys" — these are visually clear but screen readers would benefit from full labels like "User", "Assistant", "System" via `aria-label`.

---

## 9. Build & Deployment

### 9.1 No CI/CD Pipeline

No GitHub Actions workflow for lint, typecheck, test, or build. Changes can be merged without verification.

**Recommendation:** Add a `.github/workflows/ci.yml` that runs `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### 9.2 Favicon Is Default Vite SVG

`index.html` still uses `href="/vite.svg"` — the default Vite placeholder favicon.

**Recommendation:** Replace with a custom LLM Tester icon.

### 9.3 No Web Manifest / PWA Support

As a client-side tool users might want to install, adding a `manifest.json` and service worker would enable PWA installation.

### 9.4 Build Target for Safari 13 May Be Too Old

`vite.config.ts` sets `target: 'safari13'` for non-Windows Tauri builds. Safari 13 (2019) lacks many modern JS features, potentially causing unnecessary transpilation and larger bundles. Tauri v2 uses WKWebView which ships with the OS — macOS 13+ uses Safari 16+.

**Recommendation:** Bump to `safari15` or `safari16` minimum.

---

## Summary — Priority Matrix

| Priority  | Item                                             | Effort |
| --------- | ------------------------------------------------ | ------ |
| 🔴 High   | 2.2 `loadFromHistory` drops topP/penalties       | Small  |
| 🔴 High   | 1.1 Anthropic adapter                            | Medium |
| 🔴 High   | 2.3 Duplicate request object in `useSendRequest` | Small  |
| 🔴 High   | 9.1 Add CI/CD pipeline                           | Small  |
| 🟡 Medium | 1.4 History search & filtering                   | Medium |
| 🟡 Medium | 3.2 Auto-scroll during streaming                 | Small  |
| 🟡 Medium | 3.6 System theme preference                      | Small  |
| 🟡 Medium | 2.5 Array index as key in ProviderForm models    | Small  |
| 🟡 Medium | 3.9 Image attachment support                     | Medium |
| 🟡 Medium | 7.3 Request timeout                              | Small  |
| 🟡 Medium | 2.6 Per-panel error boundaries                   | Small  |
| 🟡 Medium | 6.1 Fix ESLint errors                            | Small  |
| 🟡 Medium | 6.3 Update stale AGENTS.md                       | Small  |
| 🟢 Low    | 1.2 Google Gemini adapter                        | Medium |
| 🟢 Low    | 1.3 Collections / folders                        | Large  |
| 🟢 Low    | 1.5 Export / import                              | Medium |
| 🟢 Low    | 3.4 Confirm before losing unsent work            | Small  |
| 🟢 Low    | 4.1 Paginate history                             | Medium |
| 🟢 Low    | 5.1 Component tests                              | Large  |
| 🟢 Low    | 8.1 ARIA labels                                  | Small  |
| 🟢 Low    | 9.2 Custom favicon                               | Small  |
