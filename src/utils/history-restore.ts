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
  DEFAULT_VERBOSITY,
} from '@/constants/defaults';
import type { HistoryEntry } from '@/types/history';

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
    stream: entry.request.stream,
    thinkingEnabled:
      entry.request.thinking?.enabled ?? DEFAULT_THINKING_ENABLED,
    thinkingBudgetTokens:
      entry.request.thinking?.budgetTokens ?? DEFAULT_THINKING_BUDGET_TOKENS,
    effort: entry.request.effort ?? DEFAULT_EFFORT,
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
