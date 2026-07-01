import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { ProviderConfig } from '@/types/provider';
import type { MessageAttachment, NormalizedMessage } from '@/types/normalized';
import type {
  EvalRunRecord,
  EvalRunResult,
  EvalRunner,
  EvalSharedRequest,
  JudgeConfig,
  JudgeResult,
} from '@/types/eval';
import { emptyResult } from '@/types/eval';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TOP_P,
  DEFAULT_TOP_K,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
} from '@/constants/defaults';
import { runEval, type EvalRunnerUpdate } from '@/services/eval-runner';
import { runJudge, DEFAULT_JUDGE_RUBRIC } from '@/services/judge-runner';
import { useProviderStore } from '@/stores/provider-store';
import { useEnvironmentStore } from '@/stores/environment-store';
import { interpolateComposerFields } from '@/utils/variables';
import {
  createEmptyHeaderEntry,
  headersToHistoryEntries,
  historyEntriesToHeaders,
  type HeaderEntry,
} from '@/utils/headers';
import { useComposerStore } from '@/stores/composer-store';

export const MAX_COMPARE_SELECTION = 2;

export interface EvalComposerState {
  systemPrompt: string;
  messages: NormalizedMessage[];
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
  customHeaders: HeaderEntry[];
}

interface RunHandle {
  cancel: () => void;
}

interface EvalStoreState {
  composer: EvalComposerState;
  runners: EvalRunner[];
  judgeConfig: JudgeConfig;
  results: Record<string, EvalRunResult>;
  judgeResult: JudgeResult | null;
  isRunning: boolean;
  isJudging: boolean;
  activeRunId: string | null;
  compareSelection: string[];
  error: string | null;
  lastSavedRecordId: string | null;
  _runHandle: RunHandle | null;
  _judgeHandle: RunHandle | null;
}

interface EvalStoreActions {
  setSystemPrompt: (prompt: string) => void;
  updateMessage: (index: number, patch: Partial<NormalizedMessage>) => void;
  addMessage: (role: 'user' | 'assistant') => void;
  removeMessage: (index: number) => void;
  addAttachment: (messageIndex: number, attachment: MessageAttachment) => void;
  removeAttachment: (messageIndex: number, attachmentId: string) => void;
  setTemperature: (v: number) => void;
  setMaxTokens: (v: number) => void;
  setTopP: (v: number) => void;
  setTopK: (v: number) => void;
  setFrequencyPenalty: (v: number) => void;
  setPresencePenalty: (v: number) => void;
  setStream: (stream: boolean) => void;
  resetParameters: () => void;
  setCustomHeaders: (headers: HeaderEntry[]) => void;

  addRunner: (runner: { providerId: string; modelId: string }) => void;
  removeRunner: (runnerId: string) => void;
  reorderRunners: (orderedIds: string[]) => void;

  setJudgeEnabled: (enabled: boolean) => void;
  setJudgeRunner: (
    runner: { providerId: string; modelId: string } | null,
  ) => void;
  setJudgeRubric: (rubric: string) => void;

  setRating: (runnerId: string, rating: number | null) => void;
  setThumbs: (runnerId: string, thumbs: 'up' | 'down' | null) => void;

  toggleCompare: (runnerId: string) => void;
  clearCompare: () => void;

  start: () => Promise<void>;
  cancelAll: () => void;
  cancelOne: (runnerId: string) => void;

  loadRun: (record: EvalRunRecord) => void;
  reset: () => void;
  seedFromMainComposer: () => void;

  /** Build a serializable EvalRunRecord from current state */
  buildRecord: (name?: string) => EvalRunRecord;
}

export type EvalStore = EvalStoreState & EvalStoreActions;

export function selectHasUnsavedEvalChanges(
  state: Pick<
    EvalStoreState,
    | 'composer'
    | 'runners'
    | 'judgeConfig'
    | 'judgeResult'
    | 'activeRunId'
    | 'compareSelection'
    | 'lastSavedRecordId'
  >,
): boolean {
  const { composer, runners, judgeConfig } = state;

  if (composer.systemPrompt.trim() !== '') return true;
  if (
    composer.messages.length !== 1 ||
    composer.messages[0]?.role !== 'user' ||
    composer.messages[0]?.content.trim() !== '' ||
    (composer.messages[0]?.attachments?.length ?? 0) > 0
  ) {
    return true;
  }
  if (
    composer.temperature !== DEFAULT_TEMPERATURE ||
    composer.maxTokens !== DEFAULT_MAX_TOKENS ||
    composer.topP !== DEFAULT_TOP_P ||
    composer.topK !== DEFAULT_TOP_K ||
    composer.frequencyPenalty !== DEFAULT_FREQUENCY_PENALTY ||
    composer.presencePenalty !== DEFAULT_PRESENCE_PENALTY ||
    composer.stream !== true
  ) {
    return true;
  }
  if (
    composer.customHeaders.some(
      (header) => header.key.trim() !== '' || header.value.trim() !== '',
    )
  ) {
    return true;
  }
  if (runners.length > 0) return true;
  if (
    judgeConfig.enabled ||
    judgeConfig.runner !== null ||
    judgeConfig.rubric !== DEFAULT_JUDGE_RUBRIC
  ) {
    return true;
  }
  if (state.judgeResult !== null) return true;
  if (state.activeRunId !== null || state.lastSavedRecordId !== null)
    return true;
  return state.compareSelection.length > 0;
}

function createInitialParameterState(): Pick<
  EvalComposerState,
  | 'temperature'
  | 'maxTokens'
  | 'topP'
  | 'topK'
  | 'frequencyPenalty'
  | 'presencePenalty'
  | 'stream'
> {
  return {
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
    topP: DEFAULT_TOP_P,
    topK: DEFAULT_TOP_K,
    frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
    presencePenalty: DEFAULT_PRESENCE_PENALTY,
    stream: true,
  };
}

function createInitialComposer(): EvalComposerState {
  return {
    systemPrompt: '',
    messages: [{ id: nanoid(), role: 'user', content: '' }],
    ...createInitialParameterState(),
    customHeaders: [createEmptyHeaderEntry()],
  };
}

function createInitialJudgeConfig(): JudgeConfig {
  return { enabled: false, runner: null, rubric: DEFAULT_JUDGE_RUBRIC };
}

function createInitialState(): EvalStoreState {
  return {
    composer: createInitialComposer(),
    runners: [],
    judgeConfig: createInitialJudgeConfig(),
    results: {},
    judgeResult: null,
    isRunning: false,
    isJudging: false,
    activeRunId: null,
    compareSelection: [],
    error: null,
    lastSavedRecordId: null,
    _runHandle: null,
    _judgeHandle: null,
  };
}

function makeRunnerLabel(
  providers: ProviderConfig[],
  providerId: string,
  modelId: string,
): { label: string; providerName: string } {
  const provider = providers.find((p) => p.id === providerId);
  const providerName = provider?.name ?? 'Unknown provider';
  return { providerName, label: `${providerName} / ${modelId}` };
}

function composerToSharedRequest(
  composer: EvalComposerState,
): EvalSharedRequest {
  return {
    messages: composer.messages
      .filter(
        (m) => m.content.trim() || (m.attachments && m.attachments.length > 0),
      )
      .map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      })),
    systemPrompt: composer.systemPrompt,
    temperature: composer.temperature,
    maxTokens: composer.maxTokens,
    topP: composer.topP,
    topK: composer.topK,
    frequencyPenalty: composer.frequencyPenalty,
    presencePenalty: composer.presencePenalty,
    stream: composer.stream,
    customHeaders: headersToHistoryEntries(composer.customHeaders),
  };
}

export const useEvalStore = create<EvalStore>((set, get) => ({
  ...createInitialState(),

  setSystemPrompt: (systemPrompt) =>
    set((s) => ({ composer: { ...s.composer, systemPrompt } })),
  updateMessage: (index, patch) =>
    set((s) => ({
      composer: {
        ...s.composer,
        messages: s.composer.messages.map((m, i) =>
          i === index ? { ...m, ...patch } : m,
        ),
      },
    })),
  addMessage: (role) =>
    set((s) => ({
      composer: {
        ...s.composer,
        messages: [...s.composer.messages, { id: nanoid(), role, content: '' }],
      },
    })),
  removeMessage: (index) =>
    set((s) => ({
      composer: {
        ...s.composer,
        messages:
          s.composer.messages.length <= 1
            ? s.composer.messages
            : s.composer.messages.filter((_, i) => i !== index),
      },
    })),
  addAttachment: (messageIndex, attachment) =>
    set((s) => ({
      composer: {
        ...s.composer,
        messages: s.composer.messages.map((m, i) =>
          i === messageIndex
            ? { ...m, attachments: [...(m.attachments ?? []), attachment] }
            : m,
        ),
      },
    })),
  removeAttachment: (messageIndex, attachmentId) =>
    set((s) => ({
      composer: {
        ...s.composer,
        messages: s.composer.messages.map((m, i) =>
          i === messageIndex
            ? {
                ...m,
                attachments: (m.attachments ?? []).filter(
                  (a) => a.id !== attachmentId,
                ),
              }
            : m,
        ),
      },
    })),
  setTemperature: (temperature) =>
    set((s) => ({ composer: { ...s.composer, temperature } })),
  setMaxTokens: (maxTokens) =>
    set((s) => ({ composer: { ...s.composer, maxTokens } })),
  setTopP: (topP) => set((s) => ({ composer: { ...s.composer, topP } })),
  setTopK: (topK) => set((s) => ({ composer: { ...s.composer, topK } })),
  setFrequencyPenalty: (frequencyPenalty) =>
    set((s) => ({ composer: { ...s.composer, frequencyPenalty } })),
  setPresencePenalty: (presencePenalty) =>
    set((s) => ({ composer: { ...s.composer, presencePenalty } })),
  setStream: (stream) => set((s) => ({ composer: { ...s.composer, stream } })),
  resetParameters: () =>
    set((s) => ({
      composer: { ...s.composer, ...createInitialParameterState() },
    })),
  setCustomHeaders: (customHeaders) =>
    set((s) => ({ composer: { ...s.composer, customHeaders } })),

  addRunner: ({ providerId, modelId }) => {
    const state = get();
    if (
      state.runners.some(
        (r) => r.providerId === providerId && r.modelId === modelId,
      )
    ) {
      return;
    }
    const providers = useProviderStore.getState().providers;
    const { label, providerName } = makeRunnerLabel(
      providers,
      providerId,
      modelId,
    );
    const runner: EvalRunner = {
      id: nanoid(),
      providerId,
      providerName,
      modelId,
      label,
    };
    set((s) => ({
      runners: [...s.runners, runner],
      results: { ...s.results, [runner.id]: emptyResult(runner.id) },
    }));
  },
  removeRunner: (runnerId) =>
    set((s) => {
      const runners = s.runners.filter((r) => r.id !== runnerId);
      const results = { ...s.results };
      delete results[runnerId];
      return {
        runners,
        results,
        compareSelection: s.compareSelection.filter((id) => id !== runnerId),
      };
    }),
  reorderRunners: (orderedIds) =>
    set((s) => {
      const order = new Map(orderedIds.map((id, index) => [id, index]));
      return {
        runners: [...s.runners].sort(
          (a, b) =>
            (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
        ),
      };
    }),

  setJudgeEnabled: (enabled) =>
    set((s) => ({ judgeConfig: { ...s.judgeConfig, enabled } })),
  setJudgeRunner: (runner) =>
    set((s) => ({ judgeConfig: { ...s.judgeConfig, runner } })),
  setJudgeRubric: (rubric) =>
    set((s) => ({ judgeConfig: { ...s.judgeConfig, rubric } })),

  setRating: (runnerId, rating) =>
    set((s) => {
      const current = s.results[runnerId];
      if (!current) return s;
      return {
        results: { ...s.results, [runnerId]: { ...current, rating } },
      };
    }),
  setThumbs: (runnerId, thumbs) =>
    set((s) => {
      const current = s.results[runnerId];
      if (!current) return s;
      return {
        results: { ...s.results, [runnerId]: { ...current, thumbs } },
      };
    }),

  toggleCompare: (runnerId) =>
    set((s) => {
      if (s.compareSelection.includes(runnerId)) {
        return {
          compareSelection: s.compareSelection.filter((id) => id !== runnerId),
        };
      }
      const next = [...s.compareSelection, runnerId];
      if (next.length > MAX_COMPARE_SELECTION) {
        next.shift();
      }
      return { compareSelection: next };
    }),
  clearCompare: () => set({ compareSelection: [] }),

  start: async () => {
    const state = get();
    if (state.isRunning) return;
    if (state.runners.length === 0) {
      set({ error: 'Add at least one runner before starting an eval.' });
      return;
    }
    const sharedFromComposer = composerToSharedRequest(state.composer);
    if (sharedFromComposer.messages.length === 0) {
      set({ error: 'Enter at least one message before starting an eval.' });
      return;
    }

    const environment = useEnvironmentStore.getState().getSelectedEnvironment();
    const interpolated = interpolateComposerFields({
      messages: sharedFromComposer.messages,
      systemPrompt: sharedFromComposer.systemPrompt,
      customHeaders: historyEntriesToHeaders(sharedFromComposer.customHeaders),
      environment,
    });

    if (interpolated.missingVariables.length > 0) {
      set({
        error: `Missing environment variables: ${interpolated.missingVariables.join(', ')}`,
      });
      return;
    }

    const sharedRequest: EvalSharedRequest = {
      ...sharedFromComposer,
      messages: interpolated.messages,
      systemPrompt: interpolated.systemPrompt,
      customHeaders: headersToHistoryEntries(interpolated.customHeaders),
    };

    const providers = useProviderStore.getState().providers;
    const runners = state.runners;
    const initialResults: Record<string, EvalRunResult> = {};
    for (const runner of runners) {
      initialResults[runner.id] = emptyResult(runner.id);
    }

    set({
      error: null,
      isRunning: true,
      isJudging: false,
      results: initialResults,
      judgeResult: null,
      activeRunId: nanoid(),
    });

    const handle = runEval({
      runners,
      providers,
      request: sharedRequest,
      onUpdate: (update: EvalRunnerUpdate) => {
        set((s) => ({
          results: { ...s.results, [update.runnerId]: update.result },
        }));
      },
    });
    set({ _runHandle: { cancel: handle.cancel } });

    let results: EvalRunResult[] = [];
    try {
      results = await handle.promise;
    } finally {
      set({ _runHandle: null, isRunning: false });
    }

    const judgeConfig = get().judgeConfig;
    if (judgeConfig.enabled) {
      const judgeHandle = runJudge({
        config: judgeConfig,
        providers,
        request: sharedRequest,
        runners,
        results,
      });
      set({
        _judgeHandle: { cancel: judgeHandle.cancel },
        isJudging: true,
      });
      try {
        const judgeResult = await judgeHandle.promise;
        set({ judgeResult });
      } finally {
        set({ _judgeHandle: null, isJudging: false });
      }
    }
  },

  cancelAll: () => {
    const { _runHandle, _judgeHandle } = get();
    _runHandle?.cancel();
    _judgeHandle?.cancel();
  },
  cancelOne: () => {
    // Per-runner cancellation is not wired separately yet; calling cancelAll
    // mirrors the user-facing behavior of stopping the active run.
    get()._runHandle?.cancel();
  },

  loadRun: (record) => {
    const composer: EvalComposerState = {
      ...createInitialComposer(),
      systemPrompt: record.request.systemPrompt,
      messages:
        record.request.messages.length > 0
          ? record.request.messages.map((m) => ({
              id: nanoid(),
              role: m.role,
              content: m.content,
              attachments: m.attachments,
            }))
          : [{ id: nanoid(), role: 'user', content: '' }],
      temperature: record.request.temperature,
      maxTokens: record.request.maxTokens,
      topP: record.request.topP,
      topK: record.request.topK,
      frequencyPenalty: record.request.frequencyPenalty,
      presencePenalty: record.request.presencePenalty,
      stream: record.request.stream,
      customHeaders: historyEntriesToHeaders(record.request.customHeaders),
    };
    const results: Record<string, EvalRunResult> = {};
    for (const result of record.results) {
      results[result.runnerId] = result;
    }
    set({
      ...createInitialState(),
      composer,
      runners: record.runners,
      judgeConfig: record.judgeConfig,
      results,
      judgeResult: record.judgeResult,
      activeRunId: record.id,
      lastSavedRecordId: record.id,
    });
  },

  reset: () => {
    const { _runHandle, _judgeHandle } = get();
    _runHandle?.cancel();
    _judgeHandle?.cancel();
    set(createInitialState());
  },

  seedFromMainComposer: () => {
    const mainComposer = useComposerStore.getState();
    const providerStore = useProviderStore.getState();
    const provider = providerStore.getSelectedProvider();
    const model = providerStore.getSelectedModel();

    set((state) => {
      const composer: EvalComposerState = {
        systemPrompt: mainComposer.systemPrompt,
        messages:
          mainComposer.messages.length > 0
            ? mainComposer.messages.map((message) => ({
                id: message.id ?? nanoid(),
                role: message.role,
                content: message.content,
                attachments: message.attachments,
              }))
            : [{ id: nanoid(), role: 'user', content: '' }],
        temperature: mainComposer.temperature,
        maxTokens: mainComposer.maxTokens,
        topP: mainComposer.topP,
        topK: mainComposer.topK,
        frequencyPenalty: mainComposer.frequencyPenalty,
        presencePenalty: mainComposer.presencePenalty,
        stream: mainComposer.stream,
        customHeaders: mainComposer.customHeaders.map((header) => ({
          ...header,
        })),
      };

      let runners = state.runners;
      if (provider && model) {
        const alreadyAdded = runners.some(
          (runner) =>
            runner.providerId === provider.id && runner.modelId === model.id,
        );
        if (!alreadyAdded) {
          const { label, providerName } = makeRunnerLabel(
            providerStore.providers,
            provider.id,
            model.id,
          );
          const runner: EvalRunner = {
            id: nanoid(),
            providerId: provider.id,
            providerName,
            modelId: model.id,
            label,
          };
          runners = [...runners, runner];
        }
      }

      const results = { ...state.results };
      for (const runner of runners) {
        if (!results[runner.id]) {
          results[runner.id] = emptyResult(runner.id);
        }
      }

      return {
        composer,
        runners,
        results,
        error: null,
        compareSelection: [],
        judgeResult: null,
      };
    });
  },

  buildRecord: (name) => {
    const state = get();
    const shared = composerToSharedRequest(state.composer);
    const id = nanoid();
    return {
      id,
      createdAt: new Date(),
      name,
      request: shared,
      runners: state.runners,
      results: state.runners.map(
        (runner) => state.results[runner.id] ?? emptyResult(runner.id),
      ),
      judgeConfig: state.judgeConfig,
      judgeResult: state.judgeResult,
    };
  },
}));
