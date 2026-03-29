# Refactoring Notes

All issues identified and resolved.

## High Priority (resolved)

### 1. Duplicate provider/model selector logic across components

Extracted `useSelectedProvider` / `useSelectedModel` hooks from `provider-store.ts`. Updated `ResponsePanel.tsx` and `CodeView.tsx`.

### 2. Duplicate history entry creation

Hoisted `baseHistoryEntry` above try/catch in `use-send-request.ts` to eliminate duplication.

### 3. Unhandled auth types

Added `query-param` (appends `key=` to URL) and `none` auth handling in `openai.ts`.

### 4. `buildRequestUrl` interface/implementation mismatch

Removed unused `model` param from `ProviderAdapter.buildRequestUrl` interface and callsite.

## Medium Priority (resolved)

### 5. Array index as React key

Added stable `id` fields to `NormalizedMessage` and `HeaderEntry`. Updated `MessageEditor.tsx` and `HeaderEditor.tsx`.

### 6. `fetchResponse.body!` non-null assertion

Passed `body` as parameter to `handleStream` instead of using `!` assertion in `llm-client.ts`.

### 7. CopyButton setTimeout leak

Added `useRef` + `useEffect` cleanup for timeout in both `CodeView.tsx` and `RawJsonView.tsx` CopyButtons.

## Low Priority (resolved)

### 8. Unused `valuePrefix` in auth type

Removed from `ProviderConfig` auth interface in `provider.ts`.

### 9. `streamingContent` set directly

Added `setStreamContent` typed setter to `request-store.ts`. Updated `use-send-request.ts` to use it.

### 10. Unused `collections` table in DB

Kept for Phase 4 (Collections). Safe to leave as-is — empty table and type definition only.
