import { useRef, useCallback } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { sendRequest, RequestError } from '@/services/llm-client';

function extractProviderErrorDetail(rawResponse: Record<string, unknown>): string | null {
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

  try {
    const fallback = JSON.stringify(rawResponse);
    return fallback && fallback !== '{}' ? fallback : null;
  } catch {
    return null;
  }
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
    const store = useRequestStore.getState();

    if (!provider || !model) {
      store.setError('Please select a provider and model');
      store.setErrorDetail(null);
      return;
    }

    const nonEmptyMessages = store.messages.filter(
      (m) => m.content.trim() || (m.attachments && m.attachments.length > 0),
    );
    if (nonEmptyMessages.length === 0) {
      store.setError('Please enter at least one message');
      store.setErrorDetail(null);
      return;
    }

    // Reset response state
    store.setError(null);
    store.setErrorDetail(null);
    store.setResponse(null);
    store.setRawRequest(null);
    store.setRawResponse(null);
    store.setDurationMs(null);
    store.setStatusCode(null);
    store.setSentRequest({
      messages: nonEmptyMessages,
      model: model.id,
      temperature: store.temperature,
      maxTokens: store.maxTokens,
      stream: store.stream && model.supportsStreaming,
      systemPrompt: store.systemPrompt || undefined,
    });
    store.setLoading(true);
    store.setStreaming(false);
    store.setStreamContent('');

    const abortController = new AbortController();
    abortRef.current = abortController;

    const baseHistoryEntry = {
      providerId: provider.id,
      providerName: provider.name,
      modelId: model.id,
      request: {
        messages: nonEmptyMessages,
        model: model.id,
        temperature: store.temperature,
        maxTokens: store.maxTokens,
        stream: store.stream,
        systemPrompt: store.systemPrompt || undefined,
      },
    };

    try {
      const result = await sendRequest({
        provider,
        request: {
          messages: nonEmptyMessages,
          model: model.id,
          temperature: store.temperature,
          maxTokens: store.maxTokens,
          stream: store.stream && model.supportsStreaming,
          systemPrompt: store.systemPrompt || undefined,
        },
        customHeaders: store.customHeaders.length > 0
          ? Object.fromEntries(store.customHeaders.filter((h) => h.key).map((h) => [h.key, h.value]))
          : undefined,
        signal: abortController.signal,
        onStreamChunk: (chunk) => {
          if (!useRequestStore.getState().isStreaming) {
            store.setStreaming(true);
          }
          if (chunk.content) {
            store.appendStreamContent(chunk.content);
          }
        },
      });

      store.setResponse(result.response);
      store.setRawRequest(result.rawRequest);
      store.setRawResponse(result.rawResponse);
      store.setDurationMs(result.durationMs);
      store.setStatusCode(result.statusCode);

      useHistoryStore.getState().addEntry({
        ...baseHistoryEntry,
        rawRequest: result.rawRequest,
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

        store.setError(summary);
        store.setErrorDetail(detail);
        store.setRawRequest(err.rawRequest);
        store.setRawResponse(err.rawResponse);
        store.setDurationMs(err.durationMs);
        store.setStatusCode(err.status);

        useHistoryStore.getState().addEntry({
          ...baseHistoryEntry,
          rawRequest: err.rawRequest,
          response: null,
          rawResponse: err.rawResponse,
          error: detail ? `${summary}: ${detail}` : summary,
          durationMs: err.durationMs,
          statusCode: err.status,
        });
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        store.setError('Request cancelled');
        store.setErrorDetail(null);
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (err instanceof Error && isLikelyNetworkFailure(message)) {
          store.setError('Network request failed before the provider responded');
          store.setErrorDetail(getNetworkErrorDetail(message));
          store.setRawResponse({
            type: 'network_error',
            message,
            detail: getNetworkErrorDetail(message),
          });
        } else if (err instanceof Error) {
          store.setError('Unexpected request error');
          store.setErrorDetail(message);
          store.setRawResponse({ type: 'unexpected_error', message });
        } else {
          store.setError('Unknown error');
          store.setErrorDetail(String(err));
          store.setRawResponse({ type: 'unknown_error', value: String(err) });
        }
      }
    } finally {
      store.setLoading(false);
      store.setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, cancel };
}
