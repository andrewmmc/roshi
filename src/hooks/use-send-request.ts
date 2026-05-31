import { useRef, useCallback } from 'react';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import {
  sendRequest,
  RequestError,
  type SendRequestResult,
} from '@/services/llm-client';
import {
  supportsModelSelection,
  type ProviderConfig,
  type ProviderModel,
} from '@/types/provider';
import { headersToHistoryEntries, headersToRecord } from '@/utils/headers';
import type { ComposerStore } from '@/stores/composer-store';
import type { ResponseStore } from '@/stores/response-store';
import type { HistoryEntry, HistoryHeaderEntry } from '@/types/history';
import type { NormalizedRequest } from '@/types/normalized';
import { resolveModelCapabilities } from '@/models/resolver';
import { filterRequestByCapabilities } from '@/models/compatibility';

type BaseHistoryEntry = Pick<
  HistoryEntry,
  'providerId' | 'providerName' | 'modelId' | 'request'
> & { customHeaders: HistoryHeaderEntry[] };

type RequestValidationResult =
  | {
      ok: true;
      provider: ProviderConfig;
      model: ProviderModel | null;
      messages: ComposerStore['messages'];
    }
  | { ok: false; error: string };

function validateRequestInputs(
  provider: ProviderConfig | null,
  model: ProviderModel | null,
  composer: ComposerStore,
): RequestValidationResult {
  const needsModel = provider ? supportsModelSelection(provider.type) : true;
  if (!provider || (needsModel && !model)) {
    return { ok: false, error: 'Please select a provider and model' };
  }

  const messages = composer.messages.filter(
    (m) => m.content.trim() || (m.attachments && m.attachments.length > 0),
  );
  if (messages.length === 0) {
    return { ok: false, error: 'Please enter at least one message' };
  }

  return { ok: true, provider, model, messages };
}

function buildNormalizedRequest({
  composer,
  messages,
  model,
  provider,
  selectedModelId,
}: {
  composer: ComposerStore;
  messages: ComposerStore['messages'];
  model: ProviderModel | null;
  provider: ProviderConfig;
  selectedModelId: string | null;
}): NormalizedRequest {
  const modelId = model?.id ?? selectedModelId ?? '';
  const capabilities = resolveModelCapabilities(provider, modelId);

  const request: NormalizedRequest = {
    messages,
    model: modelId,
    temperature: composer.temperature,
    maxTokens: composer.maxTokens,
    topP: composer.topP,
    topK: composer.topK || undefined,
    frequencyPenalty: composer.frequencyPenalty,
    presencePenalty: composer.presencePenalty,
    stream: composer.stream && capabilities.streaming,
    systemPrompt: composer.systemPrompt || undefined,
    thinking: composer.thinkingEnabled
      ? { enabled: true, budgetTokens: composer.thinkingBudgetTokens }
      : undefined,
  };

  return filterRequestByCapabilities(request, capabilities).request;
}

function createBaseHistoryEntry({
  provider,
  request,
  composerStream,
  customHeaders,
}: {
  provider: ProviderConfig;
  request: NormalizedRequest;
  composerStream: boolean;
  customHeaders: ComposerStore['customHeaders'];
}): BaseHistoryEntry {
  return {
    providerId: provider.id,
    providerName: provider.name,
    modelId: request.model,
    request: { ...request, stream: composerStream },
    customHeaders: headersToHistoryEntries(customHeaders),
  };
}

function completeSuccessfulRequest(
  respStore: ResponseStore,
  result: SendRequestResult,
): void {
  respStore.completeResponse({
    response: result.response,
    rawRequest: result.rawRequest,
    rawResponse: result.rawResponse,
    requestUrl: result.requestUrl,
    requestHeaders: result.requestHeaders,
    responseHeaders: result.responseHeaders,
    durationMs: result.durationMs,
    statusCode: result.statusCode,
  });
}

function completeRequestError(
  respStore: ResponseStore,
  err: RequestError,
): { summary: string; detail: string | null } {
  const detail = extractProviderErrorDetail(err.rawResponse);
  const summary = `Provider returned HTTP ${err.status}`;

  respStore.completeWithError({
    error: summary,
    errorDetail: detail,
    rawRequest: err.rawRequest,
    rawResponse: err.rawResponse,
    requestUrl: err.requestUrl,
    requestHeaders: err.requestHeaders,
    responseHeaders: err.responseHeaders,
    durationMs: err.durationMs,
    statusCode: err.status,
  });

  return { summary, detail };
}

function extractProviderErrorDetail(
  rawResponse: Record<string, unknown>,
): string | null {
  const error = rawResponse.error;
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const nestedMessage = (error as { message?: unknown }).message;
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage;
    }
  }

  const message = rawResponse.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return null;
}

function isLikelyNetworkFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'load failed',
    'failed to fetch',
    'networkerror',
    'network error',
    'fetch failed',
    'the network connection was lost',
  ].some((fragment) => normalized.includes(fragment));
}

function getNetworkErrorDetail(message: string): string {
  return [
    message,
    'The app did not receive an HTTP response from the provider. This usually means DNS, TLS/certificate validation, connectivity, or an unreachable host.',
  ].join(' ');
}

function completeUnknownError(respStore: ResponseStore, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (err instanceof Error && isLikelyNetworkFailure(message)) {
    const detail = getNetworkErrorDetail(message);
    respStore.completeWithError({
      error: 'Network request failed before the provider responded',
      errorDetail: detail,
      rawResponse: {
        type: 'network_error',
        message,
        detail,
      },
    });
  } else if (err instanceof Error) {
    respStore.completeWithError({
      error: 'Unexpected request error',
      errorDetail: message,
      rawResponse: { type: 'unexpected_error', message },
    });
  } else {
    respStore.completeWithError({
      error: 'Unknown error',
      errorDetail: String(err),
      rawResponse: {
        type: 'unknown_error',
        value: String(err),
      },
    });
  }
}

export function useSendRequest() {
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async () => {
    const provider = useProviderStore.getState().getSelectedProvider();
    const model = useProviderStore.getState().getSelectedModel();
    const selectedModelId = useProviderStore.getState().selectedModelId;
    const composer = useComposerStore.getState();
    const respStore = useResponseStore.getState();

    const validation = validateRequestInputs(provider, model, composer);
    if (!validation.ok) {
      respStore.setError(validation.error);
      respStore.setErrorDetail(null);
      return;
    }

    const normalizedRequest = buildNormalizedRequest({
      composer,
      messages: validation.messages,
      model: validation.model,
      provider: validation.provider,
      selectedModelId,
    });

    respStore.startRequest(normalizedRequest);

    const abortController = new AbortController();
    abortRef.current = abortController;

    const baseHistoryEntry = createBaseHistoryEntry({
      provider: validation.provider,
      request: normalizedRequest,
      composerStream: composer.stream,
      customHeaders: composer.customHeaders,
    });

    try {
      const result = await sendRequest({
        provider: validation.provider,
        request: normalizedRequest,
        customHeaders:
          baseHistoryEntry.customHeaders.length > 0
            ? headersToRecord(baseHistoryEntry.customHeaders)
            : undefined,
        signal: abortController.signal,
        onStreamChunk: (chunk) => {
          if (chunk.content) {
            respStore.setStreamChunk(chunk.content);
          }
        },
      });

      completeSuccessfulRequest(respStore, result);

      // Append assistant response and new empty user message for multi-turn conversation
      const { addMessage } = useComposerStore.getState();
      addMessage({ role: 'assistant', content: result.response.content });
      addMessage({ role: 'user', content: '' });

      useHistoryStore.getState().addEntry({
        ...baseHistoryEntry,
        rawRequest: result.rawRequest,
        requestUrl: result.requestUrl,
        requestHeaders: result.requestHeaders,
        responseHeaders: result.responseHeaders,
        response: result.response,
        rawResponse: result.rawResponse,
        error: null,
        durationMs: result.durationMs,
        statusCode: result.statusCode,
      });
    } catch (err) {
      if (err instanceof RequestError) {
        const { summary, detail } = completeRequestError(respStore, err);

        useHistoryStore.getState().addEntry({
          ...baseHistoryEntry,
          rawRequest: err.rawRequest,
          requestUrl: err.requestUrl,
          requestHeaders: err.requestHeaders,
          responseHeaders: err.responseHeaders,
          response: null,
          rawResponse: err.rawResponse,
          error: detail ? `${summary}: ${detail}` : summary,
          durationMs: err.durationMs,
          statusCode: err.status,
        });
      } else if (err instanceof DOMException && err.name === 'TimeoutError') {
        respStore.completeWithError({
          error: 'Request timed out',
          errorDetail:
            'The request exceeded the 120-second timeout. The provider may be overloaded or unreachable.',
        });
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        respStore.completeWithError({
          error: 'Request cancelled',
          errorDetail: null,
        });
      } else {
        completeUnknownError(respStore, err);
      }
    } finally {
      respStore.finishRequest();
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, cancel };
}
