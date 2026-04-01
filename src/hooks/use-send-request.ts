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

    // Reset response state
    respStore.setError(null);
    respStore.setErrorDetail(null);
    respStore.setResponse(null);
    respStore.setRawRequest(null);
    respStore.setRawResponse(null);
    respStore.setDurationMs(null);
    respStore.setStatusCode(null);
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

    respStore.setSentRequest(normalizedRequest);
    respStore.setLoading(true);
    respStore.setStreaming(false);
    respStore.setStreamContent('');

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
          if (!useResponseStore.getState().isStreaming) {
            respStore.setStreaming(true);
          }
          if (chunk.content) {
            respStore.appendStreamContent(chunk.content);
          }
        },
      });

      respStore.setResponse(result.response);
      respStore.setRawRequest(result.rawRequest);
      respStore.setRawResponse(result.rawResponse);
      respStore.setRequestUrl(result.requestUrl);
      respStore.setDurationMs(result.durationMs);
      respStore.setStatusCode(result.statusCode);

      // Append assistant response and new empty user message for multi-turn conversation
      const { addMessage } = useComposerStore.getState();
      addMessage({ role: 'assistant', content: result.response.content });
      addMessage({ role: 'user', content: '' });

      useHistoryStore.getState().addEntry({
        ...baseHistoryEntry,
        rawRequest: result.rawRequest,
        requestUrl: result.requestUrl,
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

        respStore.setError(summary);
        respStore.setErrorDetail(detail);
        respStore.setRawRequest(err.rawRequest);
        respStore.setRawResponse(err.rawResponse);
        respStore.setDurationMs(err.durationMs);
        respStore.setStatusCode(err.status);

        useHistoryStore.getState().addEntry({
          ...baseHistoryEntry,
          rawRequest: err.rawRequest,
          requestUrl: null,
          response: null,
          rawResponse: err.rawResponse,
          error: detail ? `${summary}: ${detail}` : summary,
          durationMs: err.durationMs,
          statusCode: err.status,
        });
      } else if (err instanceof DOMException && err.name === 'TimeoutError') {
        respStore.setError('Request timed out');
        respStore.setErrorDetail(
          'The request exceeded the 120-second timeout. The provider may be overloaded or unreachable.',
        );
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        respStore.setError('Request cancelled');
        respStore.setErrorDetail(null);
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (err instanceof Error && isLikelyNetworkFailure(message)) {
          respStore.setError(
            'Network request failed before the provider responded',
          );
          respStore.setErrorDetail(getNetworkErrorDetail(message));
          respStore.setRawResponse({
            type: 'network_error',
            message,
            detail: getNetworkErrorDetail(message),
          });
        } else if (err instanceof Error) {
          respStore.setError('Unexpected request error');
          respStore.setErrorDetail(message);
          respStore.setRawResponse({ type: 'unexpected_error', message });
        } else {
          respStore.setError('Unknown error');
          respStore.setErrorDetail(String(err));
          respStore.setRawResponse({
            type: 'unknown_error',
            value: String(err),
          });
        }
      }
    } finally {
      respStore.setLoading(false);
      respStore.setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, cancel };
}
