import { useRef, useCallback } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { sendRequest, RequestError } from '@/services/llm-client';

export function useSendRequest() {
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async () => {
    const provider = useProviderStore.getState().getSelectedProvider();
    const model = useProviderStore.getState().getSelectedModel();
    const store = useRequestStore.getState();

    if (!provider || !model) {
      store.setError('Please select a provider and model');
      return;
    }

    const nonEmptyMessages = store.messages.filter((m) => m.content.trim());
    if (nonEmptyMessages.length === 0) {
      store.setError('Please enter at least one message');
      return;
    }

    // Reset response state
    store.setError(null);
    store.setResponse(null);
    store.setRawRequest(null);
    store.setRawResponse(null);
    store.setDurationMs(null);
    store.setLoading(true);
    store.setStreaming(false);
    useRequestStore.setState({ streamingContent: '' });

    const abortController = new AbortController();
    abortRef.current = abortController;

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
        customHeaders: Object.keys(store.customHeaders).length > 0 ? store.customHeaders : undefined,
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

      // Save to history
      useHistoryStore.getState().addEntry({
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
        rawRequest: result.rawRequest,
        response: result.response,
        rawResponse: result.rawResponse,
        error: null,
        durationMs: result.durationMs,
      });
    } catch (err) {
      if (err instanceof RequestError) {
        store.setError(err.message);
        store.setRawRequest(err.rawRequest);
        store.setRawResponse(err.rawResponse);
        store.setDurationMs(err.durationMs);

        useHistoryStore.getState().addEntry({
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
          rawRequest: err.rawRequest,
          response: null,
          rawResponse: err.rawResponse,
          error: err.message,
          durationMs: err.durationMs,
        });
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        store.setError('Request cancelled');
      } else {
        store.setError(err instanceof Error ? err.message : 'Unknown error');
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
