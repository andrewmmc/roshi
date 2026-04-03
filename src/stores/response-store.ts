import { create } from 'zustand';
import type { NormalizedRequest, NormalizedResponse } from '@/types/normalized';

interface ResponseState {
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  response: NormalizedResponse | null;
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
}

interface ResponseActions {
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamContent: (content: string) => void;
  appendStreamContent: (content: string) => void;
  setResponse: (response: NormalizedResponse | null) => void;
  setRawRequest: (raw: Record<string, unknown> | null) => void;
  setRawResponse: (raw: Record<string, unknown> | null) => void;
  setRequestUrl: (url: string | null) => void;
  setRequestHeaders: (headers: Record<string, string> | null) => void;
  setResponseHeaders: (headers: Record<string, string> | null) => void;
  setError: (error: string | null) => void;
  setErrorDetail: (detail: string | null) => void;
  setDurationMs: (ms: number | null) => void;
  setStatusCode: (code: number | null) => void;
  setSentRequest: (request: NormalizedRequest | null) => void;
  resetResponse: () => void;
  loadResponseFromHistory: (data: {
    messages: { id?: string; role: string; content: string }[];
    stream: boolean;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    response: NormalizedResponse | null;
    rawRequest: Record<string, unknown> | null;
    rawResponse: Record<string, unknown> | null;
    requestUrl: string | null;
    error: string | null;
    durationMs: number | null;
    statusCode: number | null;
  }) => void;
}

export type ResponseStore = ResponseState & ResponseActions;

const INITIAL_RESPONSE_STATE: ResponseState = {
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  response: null,
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
};

export const useResponseStore = create<ResponseStore>((set) => ({
  ...INITIAL_RESPONSE_STATE,

  setLoading: (isLoading) => set({ isLoading }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamContent: (streamingContent) => set({ streamingContent }),
  appendStreamContent: (content) =>
    set((s) => ({ streamingContent: s.streamingContent + content })),
  setResponse: (response) => set({ response }),
  setRawRequest: (rawRequest) => set({ rawRequest }),
  setRawResponse: (rawResponse) => set({ rawResponse }),
  setRequestUrl: (requestUrl) => set({ requestUrl }),
  setRequestHeaders: (requestHeaders) => set({ requestHeaders }),
  setResponseHeaders: (responseHeaders) => set({ responseHeaders }),
  setError: (error) => set({ error }),
  setErrorDetail: (errorDetail) => set({ errorDetail }),
  setDurationMs: (durationMs) => set({ durationMs }),
  setStatusCode: (statusCode) => set({ statusCode }),
  setSentRequest: (sentRequest) => set({ sentRequest }),

  resetResponse: () => set({ ...INITIAL_RESPONSE_STATE }),

  loadResponseFromHistory: (data) =>
    set({
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      response: data.response,
      rawRequest: data.rawRequest,
      rawResponse: data.rawResponse,
      requestUrl: data.requestUrl,
      error: data.error,
      errorDetail: null,
      durationMs: data.durationMs,
      statusCode: data.statusCode ?? null,
      sentRequest: {
        messages: data.messages.map((m) => ({
          ...m,
          role: m.role as 'system' | 'user' | 'assistant',
        })),
        model: '',
        stream: data.stream,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
      },
    }),
}));
