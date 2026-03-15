import { useRef, useCallback } from 'react';
import { useRequestStore } from '@/stores/request-store';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { sendRequest, RequestError } from '@/services/llm-client';

export function useSendRequest() {
  const abortRef = useRef<AbortController | null>(null);
  const compareAbortRef = useRef<AbortController | null>(null);

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
    store.setStatusCode(null);
    store.setPrimaryRunMeta({
      providerId: provider.id,
      providerName: provider.name,
      modelId: model.id,
      modelDisplayName: model.displayName,
    });
    store.resetComparison();

    const request = {
      messages: nonEmptyMessages,
      model: model.id,
      temperature: store.temperature,
      maxTokens: store.maxTokens,
      stream: store.stream && model.supportsStreaming,
      systemPrompt: store.systemPrompt || undefined,
    };
    store.setSentRequest(request);
    store.setLoading(true);
    store.setStreaming(false);
    useRequestStore.setState({ streamingContent: '' });

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const result = await sendRequest({
        provider,
        request,
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

      // Save to history
      useHistoryStore.getState().addEntry({
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        request,
        rawRequest: result.rawRequest,
        response: result.response,
        rawResponse: result.rawResponse,
        error: null,
        durationMs: result.durationMs,
        statusCode: result.statusCode,
      });
    } catch (err) {
      if (err instanceof RequestError) {
        store.setError(err.message);
        store.setRawRequest(err.rawRequest);
        store.setRawResponse(err.rawResponse);
        store.setDurationMs(err.durationMs);
        store.setStatusCode(err.status);

        useHistoryStore.getState().addEntry({
          providerId: provider.id,
          providerName: provider.name,
          modelId: model.id,
          request,
          rawRequest: err.rawRequest,
          response: null,
          rawResponse: err.rawResponse,
          error: err.message,
          durationMs: err.durationMs,
          statusCode: err.status,
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

  const compare = useCallback(async () => {
    const providerStore = useProviderStore.getState();
    const store = useRequestStore.getState();
    const sourceRequest = store.sentRequest;

    if (!sourceRequest) {
      store.setComparison({
        error: 'Send a request first, then click Compare.',
      });
      return;
    }

    const providers = providerStore.providers;
    if (providers.length === 0) {
      store.setComparison({
        error: 'No providers configured for comparison.',
      });
      return;
    }

    const preferredProvider =
      providers.find((p) => p.id === store.compareTargetProviderId) ||
      providers.find((p) => p.id !== store.primaryRunMeta?.providerId) ||
      providers[0] ||
      null;
    const preferredModel =
      preferredProvider?.models.find((m) => m.id === store.compareTargetModelId) ||
      preferredProvider?.models[0] ||
      null;

    if (!preferredProvider || !preferredModel) {
      store.setComparison({
        error: 'Please choose a valid compare provider and model.',
      });
      return;
    }

    if (
      store.primaryRunMeta &&
      store.primaryRunMeta.providerId === preferredProvider.id &&
      store.primaryRunMeta.modelId === preferredModel.id
    ) {
      store.setComparison({
        error: 'Choose a different provider/model for comparison.',
      });
      return;
    }

    store.setCompareTargetProviderId(preferredProvider.id);
    store.setCompareTargetModelId(preferredModel.id);

    const compareRequest = {
      ...sourceRequest,
      model: preferredModel.id,
      stream: sourceRequest.stream && preferredModel.supportsStreaming,
    };

    store.setComparison({
      isLoading: true,
      isStreaming: false,
      streamingContent: '',
      response: null,
      rawRequest: null,
      rawResponse: null,
      error: null,
      durationMs: null,
      statusCode: null,
      sentRequest: compareRequest,
      runMeta: {
        providerId: preferredProvider.id,
        providerName: preferredProvider.name,
        modelId: preferredModel.id,
        modelDisplayName: preferredModel.displayName,
      },
    });

    const abortController = new AbortController();
    compareAbortRef.current = abortController;

    try {
      const result = await sendRequest({
        provider: preferredProvider,
        request: compareRequest,
        customHeaders: store.customHeaders.length > 0
          ? Object.fromEntries(store.customHeaders.filter((h) => h.key).map((h) => [h.key, h.value]))
          : undefined,
        signal: abortController.signal,
        onStreamChunk: (chunk) => {
          useRequestStore.setState((state) => ({
            comparison: {
              ...state.comparison,
              isStreaming: true,
              streamingContent: state.comparison.streamingContent + (chunk.content || ''),
            },
          }));
        },
      });

      store.setComparison({
        response: result.response,
        rawRequest: result.rawRequest,
        rawResponse: result.rawResponse,
        durationMs: result.durationMs,
        statusCode: result.statusCode,
      });

      useHistoryStore.getState().addEntry({
        providerId: preferredProvider.id,
        providerName: preferredProvider.name,
        modelId: preferredModel.id,
        request: compareRequest,
        rawRequest: result.rawRequest,
        response: result.response,
        rawResponse: result.rawResponse,
        error: null,
        durationMs: result.durationMs,
        statusCode: result.statusCode,
      });
    } catch (err) {
      if (err instanceof RequestError) {
        store.setComparison({
          error: err.message,
          rawRequest: err.rawRequest,
          rawResponse: err.rawResponse,
          durationMs: err.durationMs,
          statusCode: err.status,
        });

        useHistoryStore.getState().addEntry({
          providerId: preferredProvider.id,
          providerName: preferredProvider.name,
          modelId: preferredModel.id,
          request: compareRequest,
          rawRequest: err.rawRequest,
          response: null,
          rawResponse: err.rawResponse,
          error: err.message,
          durationMs: err.durationMs,
          statusCode: err.status,
        });
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        store.setComparison({ error: 'Comparison request cancelled' });
      } else {
        store.setComparison({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    } finally {
      store.setComparison({
        isLoading: false,
        isStreaming: false,
      });
      compareAbortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    compareAbortRef.current?.abort();
  }, []);

  return { send, cancel, compare };
}
