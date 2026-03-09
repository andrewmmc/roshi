import { create } from 'zustand';
import type { NormalizedMessage, NormalizedResponse } from '@/types/normalized';

interface RequestStore {
  messages: NormalizedMessage[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  customHeaders: Record<string, string>;

  // Response state
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  response: NormalizedResponse | null;
  rawRequest: Record<string, unknown> | null;
  rawResponse: Record<string, unknown> | null;
  error: string | null;
  durationMs: number | null;

  // Actions
  setMessages: (messages: NormalizedMessage[]) => void;
  addMessage: (message: NormalizedMessage) => void;
  updateMessage: (index: number, message: NormalizedMessage) => void;
  removeMessage: (index: number) => void;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setStream: (stream: boolean) => void;
  setCustomHeaders: (headers: Record<string, string>) => void;

  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamContent: (content: string) => void;
  setResponse: (response: NormalizedResponse | null) => void;
  setRawRequest: (raw: Record<string, unknown> | null) => void;
  setRawResponse: (raw: Record<string, unknown> | null) => void;
  setError: (error: string | null) => void;
  setDurationMs: (ms: number | null) => void;

  reset: () => void;
  loadFromHistory: (data: {
    messages: NormalizedMessage[];
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    stream: boolean;
    response: NormalizedResponse | null;
    rawRequest: Record<string, unknown> | null;
    rawResponse: Record<string, unknown> | null;
    error: string | null;
    durationMs: number | null;
  }) => void;
}

export const useRequestStore = create<RequestStore>((set) => ({
  messages: [{ role: 'user', content: '' }],
  systemPrompt: '',
  temperature: 1,
  maxTokens: 4096,
  stream: true,
  customHeaders: {},

  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  response: null,
  rawRequest: null,
  rawResponse: null,
  error: null,
  durationMs: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateMessage: (index, message) =>
    set((s) => ({ messages: s.messages.map((m, i) => (i === index ? message : m)) })),
  removeMessage: (index) => set((s) => ({ messages: s.messages.filter((_, i) => i !== index) })),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setStream: (stream) => set({ stream }),
  setCustomHeaders: (customHeaders) => set({ customHeaders }),

  setLoading: (isLoading) => set({ isLoading }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamContent: (content) => set((s) => ({ streamingContent: s.streamingContent + content })),
  setResponse: (response) => set({ response }),
  setRawRequest: (rawRequest) => set({ rawRequest }),
  setRawResponse: (rawResponse) => set({ rawResponse }),
  setError: (error) => set({ error }),
  setDurationMs: (durationMs) => set({ durationMs }),

  reset: () =>
    set({
      messages: [{ role: 'user', content: '' }],
      systemPrompt: '',
      temperature: 1,
      maxTokens: 4096,
      stream: true,
      customHeaders: {},
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      response: null,
      rawRequest: null,
      rawResponse: null,
      error: null,
      durationMs: null,
    }),

  loadFromHistory: (data) =>
    set({
      messages: data.messages,
      systemPrompt: data.systemPrompt,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      stream: data.stream,
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      response: data.response,
      rawRequest: data.rawRequest,
      rawResponse: data.rawResponse,
      error: data.error,
      durationMs: data.durationMs,
    }),
}));
