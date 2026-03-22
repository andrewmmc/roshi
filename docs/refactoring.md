# Refactoring Notes

## High Priority

### 1. Duplicate provider/model selector logic across components
`ResponsePanel.tsx:16-19` and `CodeView.tsx:31-41` both inline the same `.find()` selector. The store already has `getSelectedProvider()` / `getSelectedModel()` — expose them as hooks or use `useProviderStore.getState()` pattern consistently.

### 2. Duplicate history entry creation
`use-send-request.ts:80-98` (success) and `107-125` (error) — ~40 lines of nearly identical `addEntry(...)` calls. Extract a `buildHistoryEntry()` helper.

### 3. Unhandled auth types
`provider.ts:15` defines `query-param` and `none`, and the ProviderForm lets users select them, but `openai.ts:32-37` only handles `bearer` and `api-key-header`. Requests will silently send without auth if a user picks these.

### 4. `buildRequestUrl` interface/implementation mismatch
`types.ts:7` declares `(provider, model)` but `openai.ts:46` ignores the `model` param. TypeScript allows this (fewer params is valid) but the interface is misleading. Either remove the unused `model` param from the interface, or use it.

## Medium Priority

### 5. Array index as React key
`MessageEditor.tsx:38` and `HeaderEditor.tsx:28` use `key={index}`. When users delete/reorder messages, React can mix up component state. Should use a stable ID per message.

### 6. `fetchResponse.body!` non-null assertion
`llm-client.ts:75`. The `body` is already validated on line 57, but the `!` is a code smell. Pass `body` as a parameter to `handleStream` instead.

### 7. CopyButton setTimeout leak
`CodeView.tsx:15` and `RawJsonView.tsx`. If the component unmounts during the 2s timeout, React will warn about state updates on unmounted components. Should clean up with `useEffect` return or `useRef`.

## Low Priority (cleanup)

### 8. Unused `valuePrefix` in auth type
`provider.ts:17` is defined but never read anywhere.

### 9. `streamingContent` set directly
`use-send-request.ts:43` uses `useRequestStore.setState({ streamingContent: '' })` while the rest of the file uses typed setter methods. Minor inconsistency.

### 10. Unused `collections` table in DB
`db/index.ts` defines it but nothing uses it yet (Phase 4).
