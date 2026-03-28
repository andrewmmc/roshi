import type { ProviderConfig, ProviderModel } from '@/types/provider';
import type { NormalizedMessage, NormalizedRequest } from '@/types/normalized';
import type { HistoryEntry, HistoryHeaderEntry } from '@/types/history';
import type { CodeGenParams } from '@/services/codegen/types';

export function makeModel(overrides?: Partial<ProviderModel>): ProviderModel {
  return {
    id: 'gpt-4',
    name: 'gpt-4',
    displayName: 'GPT-4',
    supportsStreaming: true,
    ...overrides,
  };
}

export function makeProvider(overrides?: Partial<ProviderConfig>): ProviderConfig {
  return {
    id: 'test-provider',
    name: 'TestProvider',
    type: 'openai-compatible',
    baseUrl: 'https://api.test.com/v1',
    auth: { type: 'bearer' },
    apiKey: 'test-key',
    endpoints: { chat: '/chat/completions' },
    models: [makeModel()],
    isBuiltIn: false,
    ...overrides,
  };
}

export function makeMessage(overrides?: Partial<NormalizedMessage>): NormalizedMessage {
  return {
    role: 'user',
    content: 'Hello',
    ...overrides,
  };
}

export function makeRequest(overrides?: Partial<NormalizedRequest>): NormalizedRequest {
  return {
    messages: [makeMessage()],
    model: 'gpt-4',
    stream: false,
    temperature: 1,
    maxTokens: 4096,
    ...overrides,
  };
}

export function makeOpenAIResponse(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'chatcmpl-123',
    model: 'gpt-4',
    choices: [
      {
        message: { role: 'assistant', content: 'Hello there!' },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
    ...overrides,
  };
}

export function makeHistoryHeader(overrides?: Partial<HistoryHeaderEntry>): HistoryHeaderEntry {
  return {
    key: 'X-Test',
    value: 'value',
    ...overrides,
  };
}

export function makeHistoryEntry(overrides?: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'history-1',
    providerId: 'test-provider',
    providerName: 'TestProvider',
    modelId: 'gpt-4',
    request: makeRequest(),
    customHeaders: [],
    rawRequest: { model: 'gpt-4', messages: [{ role: 'user', content: 'Hello' }] },
    response: {
      id: 'chatcmpl-123',
      model: 'gpt-4',
      content: 'Hello there!',
      role: 'assistant',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    },
    rawResponse: makeOpenAIResponse(),
    error: null,
    durationMs: 150,
    statusCode: 200,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeCodeGenParams(overrides?: Partial<CodeGenParams>): CodeGenParams {
  return {
    provider: makeProvider(),
    model: 'gpt-4',
    messages: [makeMessage()],
    systemPrompt: '',
    temperature: 1,
    maxTokens: 4096,
    stream: false,
    ...overrides,
  };
}
