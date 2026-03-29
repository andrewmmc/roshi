import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  NormalizedMessage,
  NormalizedRequest,
  NormalizedResponse,
  MessageAttachment,
} from '@/types/normalized';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TOP_P,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
} from '@/constants/defaults';
import type { HistoryHeaderEntry } from '@/types/history';

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
}

interface RequestStore {
  messages: NormalizedMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
  customHeaders: HeaderEntry[];

  // Response state
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  response: NormalizedResponse | null;
  rawRequest: Record<string, unknown> | null;
  rawResponse: Record<string, unknown> | null;
  error: string | null;
  errorDetail: string | null;
  durationMs: number | null;
  statusCode: number | null;
  sentRequest: NormalizedRequest | null;

  // Actions
  setMessages: (messages: NormalizedMessage[]) => void;
  addMessage: (message: NormalizedMessage) => void;
  updateMessage: (index: number, message: NormalizedMessage) => void;
  removeMessage: (index: number) => void;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setTopP: (topP: number) => void;
  setFrequencyPenalty: (penalty: number) => void;
  setPresencePenalty: (penalty: number) => void;
  setStream: (stream: boolean) => void;
  addAttachment: (messageIndex: number, attachment: MessageAttachment) => void;
  removeAttachment: (messageIndex: number, attachmentId: string) => void;
  setCustomHeaders: (headers: HeaderEntry[]) => void;

  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamContent: (content: string) => void;
  appendStreamContent: (content: string) => void;
  setResponse: (response: NormalizedResponse | null) => void;
  setRawRequest: (raw: Record<string, unknown> | null) => void;
  setRawResponse: (raw: Record<string, unknown> | null) => void;
  setError: (error: string | null) => void;
  setErrorDetail: (detail: string | null) => void;
  setDurationMs: (ms: number | null) => void;
  setStatusCode: (code: number | null) => void;
  setSentRequest: (request: NormalizedRequest | null) => void;

  reset: () => void;
  loadFromHistory: (data: {
    messages: NormalizedMessage[];
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stream: boolean;
    customHeaders?: HistoryHeaderEntry[];
    response: NormalizedResponse | null;
    rawRequest: Record<string, unknown> | null;
    rawResponse: Record<string, unknown> | null;
    error: string | null;
    durationMs: number | null;
    statusCode: number | null;
  }) => void;
}

export const useRequestStore = create<RequestStore>((set) => ({
  messages: [{ id: nanoid(), role: 'user', content: '' }],
  systemPrompt: '',
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
  topP: DEFAULT_TOP_P,
  frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
  presencePenalty: DEFAULT_PRESENCE_PENALTY,
  stream: true,
  customHeaders: [{ id: nanoid(), key: '', value: '' }],

  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  response: null,
  rawRequest: null,
  rawResponse: null,
  error: null,
  errorDetail: null,
  durationMs: null,
  statusCode: null,
  sentRequest: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((s) => ({
      messages: [...s.messages, { ...message, id: message.id || nanoid() }],
    })),
  updateMessage: (index, message) =>
    set((s) => ({
      messages: s.messages.map((m, i) => (i === index ? message : m)),
    })),
  removeMessage: (index) =>
    set((s) => ({ messages: s.messages.filter((_, i) => i !== index) })),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setTopP: (topP) => set({ topP }),
  setFrequencyPenalty: (frequencyPenalty) => set({ frequencyPenalty }),
  setPresencePenalty: (presencePenalty) => set({ presencePenalty }),
  setStream: (stream) => set({ stream }),
  addAttachment: (messageIndex, attachment) =>
    set((s) => ({
      messages: s.messages.map((m, i) =>
        i === messageIndex
          ? { ...m, attachments: [...(m.attachments || []), attachment] }
          : m,
      ),
    })),
  removeAttachment: (messageIndex, attachmentId) =>
    set((s) => ({
      messages: s.messages.map((m, i) =>
        i === messageIndex
          ? {
              ...m,
              attachments: (m.attachments || []).filter(
                (a) => a.id !== attachmentId,
              ),
            }
          : m,
      ),
    })),
  setCustomHeaders: (customHeaders) => set({ customHeaders }),

  setLoading: (isLoading) => set({ isLoading }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamContent: (streamingContent) => set({ streamingContent }),
  appendStreamContent: (content) =>
    set((s) => ({ streamingContent: s.streamingContent + content })),
  setResponse: (response) => set({ response }),
  setRawRequest: (rawRequest) => set({ rawRequest }),
  setRawResponse: (rawResponse) => set({ rawResponse }),
  setError: (error) => set({ error }),
  setErrorDetail: (errorDetail) => set({ errorDetail }),
  setDurationMs: (durationMs) => set({ durationMs }),
  setStatusCode: (statusCode) => set({ statusCode }),
  setSentRequest: (sentRequest) => set({ sentRequest }),

  reset: () =>
    set({
      messages: [{ id: nanoid(), role: 'user', content: '' }],
      systemPrompt: '',
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      topP: DEFAULT_TOP_P,
      frequencyPenalty: DEFAULT_FREQUENCY_PENALTY,
      presencePenalty: DEFAULT_PRESENCE_PENALTY,
      stream: true,
      customHeaders: [{ id: nanoid(), key: '', value: '' }],
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      response: null,
      rawRequest: null,
      rawResponse: null,
      error: null,
      errorDetail: null,
      durationMs: null,
      statusCode: null,
      sentRequest: null,
    }),

  loadFromHistory: (data) =>
    set({
      messages: data.messages.map((m) => ({ ...m, id: m.id || nanoid() })),
      systemPrompt: data.systemPrompt,
      customHeaders:
        (data.customHeaders ?? []).length > 0
          ? (data.customHeaders ?? []).map((header) => ({
              ...header,
              id: nanoid(),
            }))
          : [{ id: nanoid(), key: '', value: '' }],
      sentRequest: {
        messages: data.messages,
        model: '',
        stream: data.stream,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
      },
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      topP: data.topP,
      frequencyPenalty: data.frequencyPenalty,
      presencePenalty: data.presencePenalty,
      stream: data.stream,
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      response: data.response,
      rawRequest: data.rawRequest,
      rawResponse: data.rawResponse,
      error: data.error,
      errorDetail: null,
      durationMs: data.durationMs,
      statusCode: data.statusCode ?? null,
    }),
}));
