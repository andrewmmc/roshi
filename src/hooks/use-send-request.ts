import { useCallback } from 'react';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { useEnvironmentStore } from '@/stores/environment-store';
import { toast } from '@/stores/toast-store';
import {
  sendRequest,
  RequestError,
  StreamError,
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
import {
  buildCompatibleRequestFromComposer,
  filterComposerMessages,
} from '@/utils/build-normalized-request';
import { interpolateComposerFields } from '@/utils/variables';

type BaseHistoryEntry = Pick<
  HistoryEntry,
  | 'providerId'
  | 'providerName'
  | 'modelId'
  | 'collectionId'
  | 'savedRequestId'
  | 'request'
> & { customHeaders: HistoryHeaderEntry[] };

type RequestValidationResult =
  | {
      ok: true;
      provider: ProviderConfig;
      model: ProviderModel | null;
      messages: ComposerStore['messages'];
    }
  | { ok: false; error: string };

const MESSAGE_REQUIRED_ERROR = 'Please enter at least one message';

function validateRequestInputs(
  provider: ProviderConfig | null,
  model: ProviderModel | null,
  composer: ComposerStore,
): RequestValidationResult {
  const needsModel = provider ? supportsModelSelection(provider.type) : true;
  if (!provider || (needsModel && !model)) {
    return { ok: false, error: 'Please select a provider and model' };
  }

  const messages = filterComposerMessages(composer.messages);
  if (messages.length === 0) {
    return { ok: false, error: MESSAGE_REQUIRED_ERROR };
  }

  return { ok: true, provider, model, messages };
}

function buildCompatibleRequest({
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
}) {
  return buildCompatibleRequestFromComposer({
    composer,
    messages,
    model,
    provider,
    selectedModelId,
  });
}

function createBaseHistoryEntry({
  provider,
  request,
  customHeaders,
  collectionId,
  savedRequestId,
}: {
  provider: ProviderConfig;
  request: NormalizedRequest;
  customHeaders: ComposerStore['customHeaders'];
  collectionId: string | null;
  savedRequestId: string | null;
}): BaseHistoryEntry {
  return {
    providerId: provider.id,
    providerName: provider.name,
    modelId: request.model,
    collectionId: collectionId ?? undefined,
    savedRequestId: savedRequestId ?? undefined,
    request: { ...request },
    customHeaders: headersToHistoryEntries(customHeaders),
  };
}

let activeAbortController: AbortController | null = null;
let activeRequestId = 0;
let sendInFlight = false;

function isStaleRequest(requestId: number): boolean {
  return requestId !== activeRequestId;
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

const STREAM_INTERRUPTED_SUMMARY = 'Response interrupted';

function completeInterruptedStream(
  respStore: ResponseStore,
  err: StreamError,
): { summary: string; detail: string } {
  const detail = err.message;

  respStore.completeResponse({
    response: err.partialResponse,
    rawRequest: err.rawRequest,
    rawResponse: err.rawResponse,
    requestUrl: err.requestUrl,
    requestHeaders: err.requestHeaders,
    responseHeaders: err.responseHeaders,
    durationMs: err.durationMs,
    statusCode: err.status,
  });
  respStore.setError(STREAM_INTERRUPTED_SUMMARY);
  respStore.setErrorDetail(detail);

  return { summary: STREAM_INTERRUPTED_SUMMARY, detail };
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
  const send = useCallback(async () => {
    if (sendInFlight || useResponseStore.getState().isLoading) {
      return;
    }

    sendInFlight = true;

    const provider = useProviderStore.getState().getSelectedProvider();
    const model = useProviderStore.getState().getSelectedModel();
    const selectedModelId = useProviderStore.getState().selectedModelId;
    const composer = useComposerStore.getState();
    const respStore = useResponseStore.getState();
    const environment = useEnvironmentStore.getState().getSelectedEnvironment();

    const interpolated = interpolateComposerFields({
      messages: composer.messages,
      systemPrompt: composer.systemPrompt,
      customHeaders: composer.customHeaders,
      environment,
    });

    if (interpolated.missingVariables.length > 0) {
      respStore.failValidation(
        `Missing environment variables: ${interpolated.missingVariables.join(', ')}`,
        environment
          ? 'Add these variables to the selected environment or remove the placeholders before sending.'
          : 'Select an environment with these variables or remove the placeholders before sending.',
      );
      sendInFlight = false;
      return;
    }

    const requestComposer: ComposerStore = {
      ...composer,
      messages: interpolated.messages,
      systemPrompt: interpolated.systemPrompt,
      customHeaders: interpolated.customHeaders,
    };

    const validation = validateRequestInputs(provider, model, requestComposer);
    if (!validation.ok) {
      respStore.failValidation(validation.error, null);
      if (validation.error === MESSAGE_REQUIRED_ERROR) {
        toast(validation.error);
      }
      sendInFlight = false;
      return;
    }

    const compatibility = buildCompatibleRequest({
      composer: requestComposer,
      messages: validation.messages,
      model: validation.model,
      provider: validation.provider,
      selectedModelId,
    });
    const normalizedRequest = compatibility.request;

    respStore.startRequest(normalizedRequest, compatibility.warnings);

    activeAbortController?.abort();
    const abortController = new AbortController();
    activeAbortController = abortController;
    const requestId = ++activeRequestId;

    const baseHistoryEntry = createBaseHistoryEntry({
      provider: validation.provider,
      request: normalizedRequest,
      customHeaders: requestComposer.customHeaders,
      collectionId: composer.activeCollectionId,
      savedRequestId: composer.activeSavedRequestId,
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
          if (chunk.content && !isStaleRequest(requestId)) {
            useResponseStore.getState().setStreamChunk(chunk.content);
          }
        },
      });

      if (isStaleRequest(requestId)) {
        return;
      }

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
      if (isStaleRequest(requestId)) {
        return;
      }

      if (err instanceof StreamError) {
        const { summary, detail } = completeInterruptedStream(respStore, err);

        const { addMessage } = useComposerStore.getState();
        if (err.partialResponse.content) {
          addMessage({
            role: 'assistant',
            content: err.partialResponse.content,
          });
          addMessage({ role: 'user', content: '' });
        }

        useHistoryStore.getState().addEntry({
          ...baseHistoryEntry,
          rawRequest: err.rawRequest,
          requestUrl: err.requestUrl,
          requestHeaders: err.requestHeaders,
          responseHeaders: err.responseHeaders,
          response: err.partialResponse,
          rawResponse: err.rawResponse,
          error: `${summary}: ${detail}`,
          durationMs: err.durationMs,
          statusCode: err.status,
        });
      } else if (err instanceof RequestError) {
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
      if (!isStaleRequest(requestId)) {
        respStore.finishRequest();
        if (activeAbortController === abortController) {
          activeAbortController = null;
        }
      }
      sendInFlight = false;
    }
  }, []);

  const cancel = useCallback(() => {
    activeAbortController?.abort();
  }, []);

  return { send, cancel };
}
