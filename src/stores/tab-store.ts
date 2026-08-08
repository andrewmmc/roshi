import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  NormalizedMessage,
  NormalizedRequest,
  NormalizedResponse,
} from '@/types/normalized';
import type { HeaderEntry } from '@/utils/headers';
import { createEmptyHeaderEntry } from '@/utils/headers';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TOP_P,
  DEFAULT_TOP_K,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_THINKING_ENABLED,
  DEFAULT_THINKING_BUDGET_TOKENS,
  DEFAULT_EFFORT,
  DEFAULT_REASONING_MODE,
  DEFAULT_VERBOSITY,
} from '@/constants/defaults';
import {
  createDefaultParamEnabled,
  resolveParamEnabled,
  type ParamEnabledState,
} from '@/types/optional-params';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { toast } from '@/stores/toast-store';
import {
  createLoadGuard,
  loadSetting,
  persistSetting,
} from '@/stores/store-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot types — serialisable subsets of store state (no action functions)
// ─────────────────────────────────────────────────────────────────────────────

export interface ComposerSnapshot {
  messages: NormalizedMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  paramEnabled: ParamEnabledState;
  stream: boolean;
  thinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  effort: string;
  reasoningMode: string;
  verbosity: string;
  customHeaders: HeaderEntry[];
  activeCollectionId: string | null;
  activeSavedRequestId: string | null;
  scrollGeneration: number;
}

export interface ResponseSnapshot {
  response: NormalizedResponse | null;
  streamingContent: string;
  rawRequest: Record<string, unknown> | null;
  rawResponse: Record<string, unknown> | null;
  requestUrl: string | null;
  requestHeaders: Record<string, string> | null;
  responseHeaders: Record<string, string> | null;
  error: string | null;
  errorDetail: string | null;
  durationMs: number | null;
  statusCode: number | null;
  sentRequest: NormalizedRequest | null;
  compatibilityWarnings: string[];
}

export interface RequestTab {
  id: string;
  /** Persisted label (updated lazily on tab switch). Active tab label is derived live in the TabBar. */
  label: string;
  composer: ComposerSnapshot;
  response: ResponseSnapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants and default factories
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_TABS = 8;
export const REQUEST_SESSION_SETTING_KEY = 'request-session-v1';

export type DraftPersistenceStatus = 'idle' | 'saving' | 'saved' | 'error';

interface PersistedRequestSession {
  version: 1;
  activeTabId: string;
  tabs: Array<Pick<RequestTab, 'id' | 'label' | 'composer'>>;
}

const requestSessionLoadGuard = createLoadGuard();
const REQUEST_SESSION_SAVE_DELAY = 300;
let requestSessionReady = false;
let persistenceTimer: ReturnType<typeof setTimeout> | null = null;
let persistenceGeneration = 0;

export function createDefaultComposerSnapshot(): ComposerSnapshot {
  return {
    messages: [{ id: nanoid(), role: 'user', content: '' }],
    systemPrompt: '',
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
    topP: DEFAULT_TOP_P,
    topK: DEFAULT_TOP_K,
    frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
    presencePenalty: DEFAULT_PRESENCE_PENALTY,
    paramEnabled: createDefaultParamEnabled(),
    stream: true,
    thinkingEnabled: DEFAULT_THINKING_ENABLED,
    thinkingBudgetTokens: DEFAULT_THINKING_BUDGET_TOKENS,
    effort: DEFAULT_EFFORT,
    reasoningMode: DEFAULT_REASONING_MODE,
    verbosity: DEFAULT_VERBOSITY,
    customHeaders: [createEmptyHeaderEntry()],
    activeCollectionId: null,
    activeSavedRequestId: null,
    scrollGeneration: 0,
  };
}

function normalizeComposerSnapshot(
  snapshot: ComposerSnapshot,
): ComposerSnapshot {
  return {
    ...snapshot,
    reasoningMode: snapshot.reasoningMode ?? DEFAULT_REASONING_MODE,
    paramEnabled: resolveParamEnabled(snapshot.paramEnabled, {
      temperature: true,
      maxTokens: true,
      topP: true,
      topK: snapshot.topK > 0,
      frequencyPenalty: true,
      presencePenalty: true,
    }),
  };
}

const EMPTY_RESPONSE_SNAPSHOT: ResponseSnapshot = {
  response: null,
  streamingContent: '',
  rawRequest: null,
  rawResponse: null,
  requestUrl: null,
  requestHeaders: null,
  responseHeaders: null,
  error: null,
  errorDetail: null,
  durationMs: null,
  statusCode: null,
  sentRequest: null,
  compatibilityWarnings: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Derive a short human-readable label from a composer snapshot. */
export function computeTabLabel(messages: NormalizedMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  const text = first?.content?.trim();
  if (!text) return 'New Request';
  return text.length > 22 ? text.slice(0, 22).trimEnd() + '\u2026' : text;
}

function captureComposerSnapshot(): ComposerSnapshot {
  const s = useComposerStore.getState();
  return {
    messages: s.messages,
    systemPrompt: s.systemPrompt,
    temperature: s.temperature,
    maxTokens: s.maxTokens,
    topP: s.topP,
    topK: s.topK,
    frequencyPenalty: s.frequencyPenalty,
    presencePenalty: s.presencePenalty,
    paramEnabled: { ...s.paramEnabled },
    stream: s.stream,
    thinkingEnabled: s.thinkingEnabled,
    thinkingBudgetTokens: s.thinkingBudgetTokens,
    effort: s.effort,
    reasoningMode: s.reasoningMode,
    verbosity: s.verbosity,
    customHeaders: s.customHeaders,
    activeCollectionId: s.activeCollectionId,
    activeSavedRequestId: s.activeSavedRequestId,
    scrollGeneration: s.scrollGeneration,
  };
}

function captureResponseSnapshot(): ResponseSnapshot {
  const s = useResponseStore.getState();
  return {
    response: s.response,
    streamingContent: s.streamingContent,
    rawRequest: s.rawRequest,
    rawResponse: s.rawResponse,
    requestUrl: s.requestUrl,
    requestHeaders: s.requestHeaders,
    responseHeaders: s.responseHeaders,
    error: s.error,
    errorDetail: s.errorDetail,
    durationMs: s.durationMs,
    statusCode: s.statusCode,
    sentRequest: s.sentRequest,
    compatibilityWarnings: s.compatibilityWarnings,
  };
}

function applyComposerSnapshot(snapshot: ComposerSnapshot): void {
  const normalized = normalizeComposerSnapshot(snapshot);
  // Increment scrollGeneration so the composer scrolls to top on tab switch.
  useComposerStore.setState({
    ...normalized,
    scrollGeneration: normalized.scrollGeneration + 1,
  });
}

function applyResponseSnapshot(snapshot: ResponseSnapshot): void {
  useResponseStore.setState({
    ...snapshot,
    isLoading: false,
    isStreaming: false,
  });
}

function newBlankTab(): RequestTab {
  return {
    id: nanoid(),
    label: 'New Request',
    composer: createDefaultComposerSnapshot(),
    response: { ...EMPTY_RESPONSE_SNAPSHOT },
  };
}

function isPersistedRequestSession(
  value: unknown,
): value is PersistedRequestSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<PersistedRequestSession>;
  return (
    session.version === 1 &&
    typeof session.activeTabId === 'string' &&
    Array.isArray(session.tabs) &&
    session.tabs.length > 0 &&
    session.tabs.every(
      (tab) =>
        tab &&
        typeof tab.id === 'string' &&
        typeof tab.label === 'string' &&
        tab.composer &&
        Array.isArray(tab.composer.messages) &&
        Array.isArray(tab.composer.customHeaders),
    )
  );
}

function buildPersistedRequestSession(): PersistedRequestSession {
  const state = useTabStore.getState();
  const activeComposer = captureComposerSnapshot();
  return {
    version: 1,
    activeTabId: state.activeTabId,
    tabs: state.tabs.map((tab) => ({
      id: tab.id,
      label:
        tab.id === state.activeTabId
          ? computeTabLabel(activeComposer.messages)
          : tab.label,
      composer: tab.id === state.activeTabId ? activeComposer : tab.composer,
    })),
  };
}

export async function persistRequestSessionNow(): Promise<void> {
  const state = useTabStore.getState();
  if (!requestSessionReady || !state.hydrated) return;

  if (persistenceTimer) {
    clearTimeout(persistenceTimer);
    persistenceTimer = null;
  }

  const generation = ++persistenceGeneration;
  useTabStore.setState({ draftPersistenceStatus: 'saving' });
  try {
    await persistSetting(
      REQUEST_SESSION_SETTING_KEY,
      buildPersistedRequestSession(),
    );
    if (generation === persistenceGeneration) {
      useTabStore.setState({ draftPersistenceStatus: 'saved' });
    }
  } catch {
    if (generation === persistenceGeneration) {
      useTabStore.setState({ draftPersistenceStatus: 'error' });
    }
  }
}

export function scheduleRequestSessionPersistence(): void {
  if (!requestSessionReady || !useTabStore.getState().hydrated) return;
  if (persistenceTimer) clearTimeout(persistenceTimer);
  useTabStore.setState({ draftPersistenceStatus: 'saving' });
  persistenceTimer = setTimeout(() => {
    persistenceTimer = null;
    void persistRequestSessionNow();
  }, REQUEST_SESSION_SAVE_DELAY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Store definition
// ─────────────────────────────────────────────────────────────────────────────

const firstTab = newBlankTab();

/** Returns true when closing the tab would discard composer or response work. */
export function tabHasStoredWork(
  tab: Pick<RequestTab, 'composer' | 'response'>,
): boolean {
  const c = tab.composer;
  const hasComposer =
    c.systemPrompt.trim() !== '' ||
    c.messages.some(
      (m) => m.content.trim() !== '' || (m.attachments?.length ?? 0) > 0,
    ) ||
    c.customHeaders.some((h) => h.key.trim() !== '' || h.value.trim() !== '');
  const r = tab.response;
  const hasResponse =
    r.response !== null ||
    r.error !== null ||
    r.streamingContent !== '' ||
    r.rawResponse !== null;
  return hasComposer || hasResponse;
}

/** Includes the live composer/response state, which is newer than the active tab snapshot. */
export function activeRequestTabHasStoredWork(): boolean {
  return tabHasStoredWork({
    composer: captureComposerSnapshot(),
    response: captureResponseSnapshot(),
  });
}

interface TabStore {
  tabs: RequestTab[];
  activeTabId: string;
  hydrated: boolean;
  draftPersistenceStatus: DraftPersistenceStatus;
  hydrate: () => Promise<void>;
  createTab: () => void;
  duplicateActiveTab: () => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [firstTab],
  activeTabId: firstTab.id,
  hydrated: false,
  draftPersistenceStatus: 'idle',

  hydrate: async () =>
    requestSessionLoadGuard.run(
      () => get().hydrated,
      async () => {
        try {
          const saved = await loadSetting<unknown>(REQUEST_SESSION_SETTING_KEY);
          if (isPersistedRequestSession(saved)) {
            const restoredTabs: RequestTab[] = saved.tabs
              .slice(0, MAX_TABS)
              .map((tab) => ({
                id: tab.id,
                label: tab.label,
                composer: normalizeComposerSnapshot({
                  ...tab.composer,
                  scrollGeneration: 0,
                }),
                response: { ...EMPTY_RESPONSE_SNAPSHOT },
              }));
            const activeTab =
              restoredTabs.find((tab) => tab.id === saved.activeTabId) ??
              restoredTabs[0];
            set({
              tabs: restoredTabs,
              activeTabId: activeTab.id,
              hydrated: true,
              draftPersistenceStatus: 'idle',
            });
            applyComposerSnapshot(activeTab.composer);
            applyResponseSnapshot(activeTab.response);
          } else {
            set({ hydrated: true, draftPersistenceStatus: 'idle' });
          }
        } catch {
          set({ hydrated: true, draftPersistenceStatus: 'error' });
        } finally {
          requestSessionReady = true;
        }
      },
    ),

  createTab: () => {
    if (get().tabs.length >= MAX_TABS) {
      toast(`Maximum of ${MAX_TABS} tabs reached.`);
      return;
    }
    if (useResponseStore.getState().isLoading) {
      toast('Cannot create a new tab while a request is running.');
      return;
    }

    const composerSnap = captureComposerSnapshot();
    const responseSnap = captureResponseSnapshot();
    const label = computeTabLabel(composerSnap.messages);

    const newTab = newBlankTab();

    set((s) => ({
      tabs: [
        ...s.tabs.map((t) =>
          t.id === s.activeTabId
            ? { ...t, label, composer: composerSnap, response: responseSnap }
            : t,
        ),
        newTab,
      ],
      activeTabId: newTab.id,
    }));

    applyComposerSnapshot(newTab.composer);
    applyResponseSnapshot(newTab.response);
    scheduleRequestSessionPersistence();
  },

  duplicateActiveTab: () => {
    if (get().tabs.length >= MAX_TABS) {
      toast(`Maximum of ${MAX_TABS} tabs reached.`);
      return;
    }
    if (useResponseStore.getState().isLoading) {
      toast('Cannot duplicate a tab while a request is running.');
      return;
    }

    const composerSnap = captureComposerSnapshot();
    const responseSnap = captureResponseSnapshot();
    const label = computeTabLabel(composerSnap.messages);

    const duplicate: RequestTab = {
      id: nanoid(),
      label: label === 'New Request' ? 'New Request' : label + ' (copy)',
      composer: { ...composerSnap, scrollGeneration: 0 },
      response: { ...responseSnap },
    };

    set((s) => ({
      tabs: [
        ...s.tabs.map((t) =>
          t.id === s.activeTabId
            ? { ...t, label, composer: composerSnap, response: responseSnap }
            : t,
        ),
        duplicate,
      ],
      activeTabId: duplicate.id,
    }));

    applyComposerSnapshot(duplicate.composer);
    applyResponseSnapshot(duplicate.response);
    scheduleRequestSessionPersistence();
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;

    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;

    if (id === activeTabId && useResponseStore.getState().isLoading) {
      toast('Cannot close the active tab while a request is running.');
      return;
    }

    const newTabs = tabs.filter((t) => t.id !== id);

    if (id === activeTabId) {
      const targetTab = newTabs[Math.min(index, newTabs.length - 1)];
      set({ tabs: newTabs, activeTabId: targetTab.id });
      applyComposerSnapshot(targetTab.composer);
      applyResponseSnapshot(targetTab.response);
    } else {
      set({ tabs: newTabs });
    }
    scheduleRequestSessionPersistence();
  },

  switchTab: (targetId) => {
    const { activeTabId } = get();
    if (targetId === activeTabId) return;

    if (useResponseStore.getState().isLoading) {
      toast('Cannot switch tabs while a request is running.');
      return;
    }

    const composerSnap = captureComposerSnapshot();
    const responseSnap = captureResponseSnapshot();
    const label = computeTabLabel(composerSnap.messages);

    // Find the target before mutating state (get() is already fresh)
    const target = get().tabs.find((t) => t.id === targetId);

    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, label, composer: composerSnap, response: responseSnap }
          : t,
      ),
      activeTabId: targetId,
    }));

    if (target) {
      applyComposerSnapshot(target.composer);
      applyResponseSnapshot(target.response);
    }
    scheduleRequestSessionPersistence();
  },
}));
