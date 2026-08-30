import type { MessageKey } from '@/i18n/types';
import {
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_MAX_TOKENS,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_TEMPERATURE,
  DEFAULT_THINKING_BUDGET_TOKENS,
  DEFAULT_THINKING_ENABLED,
  DEFAULT_TOP_K,
  DEFAULT_TOP_P,
  DEFAULT_EFFORT,
  DEFAULT_REASONING_MODE,
  DEFAULT_VERBOSITY,
} from '@/constants/defaults';
import { paramEnabledFromRequest } from '@/types/optional-params';
import type { HistoryEntry } from '@/types/history';
import type { ProviderConfig, ProviderModel } from '@/types/provider';

export interface HistoryRestoreSelection {
  providerId: string | null;
  modelId: string | null;
  providerMissing: boolean;
  modelMissing: boolean;
  originalProviderId: string;
  originalModelId: string;
  originalProviderName: string;
  restoredModel: ProviderModel | null;
}

export function buildRestoredModel(modelId: string): ProviderModel {
  return {
    id: modelId,
    name: modelId,
    displayName: modelId,
    supportsStreaming: true,
    source: 'manual',
  };
}

export function resolveHistorySelection(
  entry: HistoryEntry,
  providers: ProviderConfig[],
): HistoryRestoreSelection {
  const provider = providers.find((p) => p.id === entry.providerId);
  const providerMissing = !provider;
  const modelMissing = Boolean(
    provider && !provider.models.some((m) => m.id === entry.modelId),
  );

  return {
    providerId: provider?.id ?? null,
    modelId: provider?.models.some((m) => m.id === entry.modelId)
      ? entry.modelId
      : null,
    providerMissing,
    modelMissing,
    originalProviderId: entry.providerId,
    originalModelId: entry.modelId,
    originalProviderName: entry.providerName,
    restoredModel:
      provider && modelMissing ? buildRestoredModel(entry.modelId) : null,
  };
}

export type HistoryRestoreWarning = {
  key: MessageKey;
  vars?: Record<string, string>;
};

export function buildHistoryRestoreWarning(
  selection: HistoryRestoreSelection,
): HistoryRestoreWarning | null {
  if (selection.providerMissing) {
    return { key: 'history.restoreProviderMissing' };
  }
  if (selection.modelMissing) {
    return {
      key: 'history.restoreModelMissing',
      vars: {
        model: selection.originalModelId,
        provider: selection.originalProviderName,
      },
    };
  }
  return null;
}

export function buildComposerHistoryRestore(entry: HistoryEntry) {
  const messages = [...entry.request.messages];
  if (entry.response?.content) {
    messages.push({ role: 'assistant', content: entry.response.content });
    messages.push({ role: 'user', content: '' });
  }

  return {
    messages,
    systemPrompt: entry.request.systemPrompt ?? '',
    temperature: entry.request.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: entry.request.maxTokens ?? DEFAULT_MAX_TOKENS,
    topP: entry.request.topP ?? DEFAULT_TOP_P,
    topK: entry.request.topK ?? DEFAULT_TOP_K,
    frequencyPenalty:
      entry.request.frequencyPenalty ?? DEFAULT_FREQUENCY_PENALTY,
    presencePenalty: entry.request.presencePenalty ?? DEFAULT_PRESENCE_PENALTY,
    paramEnabled: paramEnabledFromRequest(entry.request),
    stream: entry.request.stream,
    thinkingEnabled:
      entry.request.thinking?.enabled ?? DEFAULT_THINKING_ENABLED,
    thinkingBudgetTokens:
      entry.request.thinking?.budgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS,
    effort: entry.request.effort ?? DEFAULT_EFFORT,
    reasoningMode: entry.request.reasoningMode ?? DEFAULT_REASONING_MODE,
    verbosity: entry.request.verbosity ?? DEFAULT_VERBOSITY,
    customHeaders: entry.customHeaders ?? [],
  };
}

export function buildResponseHistoryRestore(entry: HistoryEntry) {
  return {
    messages: entry.request.messages,
    stream: entry.request.stream,
    systemPrompt: entry.request.systemPrompt ?? '',
    temperature: entry.request.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: entry.request.maxTokens ?? DEFAULT_MAX_TOKENS,
    response: entry.response,
    rawRequest: entry.rawRequest,
    rawResponse: entry.rawResponse,
    requestUrl: entry.requestUrl ?? null,
    requestHeaders: entry.requestHeaders ?? null,
    responseHeaders: entry.responseHeaders ?? null,
    error: entry.error,
    durationMs: entry.durationMs,
    statusCode: entry.statusCode,
  };
}
