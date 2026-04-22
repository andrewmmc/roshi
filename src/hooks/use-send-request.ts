import { useRef, useCallback } from 'react';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { sendRequest, RequestError } from '@/services/llm-client';
import { supportsModelSelection } from '@/types/provider';

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

export function useSendRequest() {
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async () => {
    const provider = useProviderStore.getState().getSelectedProvider();
    const model = useProviderStore.getState().getSelectedModel();
    const selectedModelId = useProviderStore.getState().selectedModelId;
    const composer = useComposerStore.getState();
    const respStore = useResponseStore.getState();

    const needsModel = provider ? supportsModelSelection(provider.type) : true;
    if (!provider || (needsModel && !model)) {
      respStore.setError('Please select a provider and model');
      respStore.setErrorDetail(null);
      return;
    }

    const nonEmptyMessages = composer.messages.filter(
      (m) => m.content.trim() || (m.attachments && m.attachments.length > 0),
    );
    if (nonEmptyMessages.length === 0) {
      respStore.setError('Please enter at least one message');
      respStore.setErrorDetail(null);
      return;
    }

    const modelId = model?.id ?? selectedModelId ?? '';
    const normalizedRequest = {
      messages: nonEmptyMessages,
      model: modelId,
      temperature: composer.temperature,
      maxTokens: composer.maxTokens,
      topP: composer.topP,
      topK: composer.topK || undefined,
      frequencyPenalty: composer.frequencyPenalty,
      presencePenalty: composer.presencePenalty,
      stream: composer.stream && (model?.supportsStreaming ?? true),
      systemPrompt: composer.systemPrompt || undefined,
      thinking: composer.thinkingEnabled
        ? { enabled: true, budgetTokens: composer.thinkingBudgetTokens }
        : undefined,
    };

    respStore.startRequest(normalizedRequest);

    const abortController = new AbortController();
    abortRef.current = abortController;

    const historyHeaders = composer.customHeaders
      .filter((header) => header.key)
      .map(({ key, value }) => ({ key, value }));

    const baseHistoryEntry = {
      providerId: provider.id,
      providerName: provider.name,
      modelId: modelId,
      request: { ...normalizedRequest, stream: composer.stream },
      customHeaders: historyHeaders,
    };

    try {
      const result = await sendRequest({
        provider,
        request: normalizedRequest,
        customHeaders:
          historyHeaders.length > 0
            ? Object.fromEntries(
                historyHeaders.map((header) => [header.key, header.value]),
              )
            : undefined,
        signal: abortController.signal,
        onStreamChunk: (chunk) => {
          if (chunk.content) {
            respStore.setStreamChunk(chunk.content);
          }
        },
      });

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
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (err instanceof Error && isLikelyNetworkFailure(message)) {
          respStore.completeWithError({
            error: 'Network request failed before the provider responded',
            errorDetail: getNetworkErrorDetail(message),
            rawResponse: {
              type: 'network_error',
              message,
              detail: getNetworkErrorDetail(message),
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
