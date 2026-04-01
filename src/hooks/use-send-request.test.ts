import { renderHook, act } from '@testing-library/react';
import { useSendRequest } from './use-send-request';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { makeProvider, makeModel, makeMessage } from '@/__tests__/fixtures';

const { mockSendRequest, MockRequestError } = vi.hoisted(() => {
  const mockSendRequest = vi.fn();
  class MockRequestError extends Error {
    status: number;
    rawResponse: Record<string, unknown>;
    rawRequest: Record<string, unknown>;
    durationMs: number;
    constructor(
      message: string,
      status: number,
      rawResponse: Record<string, unknown>,
      rawRequest: Record<string, unknown>,
      durationMs: number,
    ) {
      super(message);
      this.name = 'RequestError';
      this.status = status;
      this.rawResponse = rawResponse;
      this.rawRequest = rawRequest;
      this.durationMs = durationMs;
    }
  }
  return { mockSendRequest, MockRequestError };
});

vi.mock('@/services/llm-client', () => ({
  sendRequest: mockSendRequest,
  RequestError: MockRequestError,
}));

// Mock db for the stores that import it
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    providers: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    history: {
      orderBy: vi.fn().mockReturnValue({
        reverse: vi
          .fn()
          .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
      add: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
}));
vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/services/models-api', () => ({
  fetchModelsForProvider: vi.fn().mockResolvedValue([]),
}));

describe('useSendRequest', () => {
  const provider = makeProvider({
    id: 'p1',
    models: [makeModel({ id: 'm1' })],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up provider store with a valid selection
    useProviderStore.setState({
      providers: [provider],
      selectedProviderId: 'p1',
      selectedModelId: 'm1',
      loaded: true,
    });
    // Set up composer store with a valid message
    useComposerStore.setState({
      messages: [makeMessage({ id: 'msg-1', content: 'Hello' })],
      systemPrompt: '',
      temperature: 1,
      maxTokens: 4096,
      stream: false,
      customHeaders: [],
    });
    // Reset response store
    useResponseStore.setState({
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
    });
    // Reset history store
    useHistoryStore.setState({ entries: [], loaded: true });
  });

  describe('validation', () => {
    it('sets error when no provider selected', async () => {
      useProviderStore.setState({
        selectedProviderId: null,
        selectedModelId: null,
      });
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(useResponseStore.getState().error).toBe(
        'Please select a provider and model',
      );
      expect(mockSendRequest).not.toHaveBeenCalled();
    });

    it('sets error when no model selected', async () => {
      useProviderStore.setState({ selectedModelId: null });
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(useResponseStore.getState().error).toBe(
        'Please select a provider and model',
      );
    });

    it('sets error when all messages are empty', async () => {
      useComposerStore.setState({ messages: [makeMessage({ content: '' })] });
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(useResponseStore.getState().error).toBe(
        'Please enter at least one message',
      );
    });

    it('accepts messages with only attachments', async () => {
      useComposerStore.setState({
        messages: [
          makeMessage({
            content: '',
            attachments: [{ id: 'a', filename: 'f', mimeType: 't', data: 'd' }],
          }),
        ],
      });
      mockSendRequest.mockResolvedValue({
        response: {
          id: '1',
          model: 'm1',
          content: 'ok',
          role: 'assistant',
          finishReason: 'stop',
          usage: null,
        },
        rawRequest: {},
        rawResponse: {},
        durationMs: 100,
        statusCode: 200,
      });
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(mockSendRequest).toHaveBeenCalled();
    });
  });

  describe('successful request', () => {
    it('sends request and stores result', async () => {
      const sendResult = {
        response: {
          id: '1',
          model: 'm1',
          content: 'Hi',
          role: 'assistant',
          finishReason: 'stop',
          usage: null,
        },
        rawRequest: { model: 'm1' },
        rawResponse: { id: '1' },
        durationMs: 150,
        statusCode: 200,
      };
      mockSendRequest.mockResolvedValue(sendResult);
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      const state = useResponseStore.getState();
      expect(state.response?.content).toBe('Hi');
      expect(state.rawRequest).toEqual({ model: 'm1' });
      expect(state.rawResponse).toEqual({ id: '1' });
      expect(state.durationMs).toBe(150);
      expect(state.statusCode).toBe(200);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.errorDetail).toBeNull();
    });

    it('adds entry to history', async () => {
      useComposerStore.setState({
        ...useComposerStore.getState(),
        customHeaders: [{ id: '1', key: 'X-Test', value: 'value' }],
      });
      mockSendRequest.mockResolvedValue({
        response: {
          id: '1',
          model: 'm1',
          content: 'ok',
          role: 'assistant',
          finishReason: 'stop',
          usage: null,
        },
        rawRequest: {},
        rawResponse: {},
        durationMs: 100,
        statusCode: 200,
      });
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(mockDb.history.add).toHaveBeenCalled();
      expect(mockDb.history.add).toHaveBeenCalledWith(
        expect.objectContaining({
          customHeaders: [{ key: 'X-Test', value: 'value' }],
        }),
      );
    });

    it('filters custom headers by non-empty key', async () => {
      useComposerStore.setState({
        ...useComposerStore.getState(),
        customHeaders: [
          { id: '1', key: 'X-Valid', value: 'yes' },
          { id: '2', key: '', value: 'skip' },
        ],
      });
      mockSendRequest.mockResolvedValue({
        response: {
          id: '1',
          model: 'm1',
          content: '',
          role: 'assistant',
          finishReason: 'stop',
          usage: null,
        },
        rawRequest: {},
        rawResponse: {},
        durationMs: 0,
        statusCode: 200,
      });
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          customHeaders: { 'X-Valid': 'yes' },
        }),
      );
    });

    it('disables stream when model does not support it', async () => {
      useProviderStore.setState({
        providers: [
          makeProvider({
            id: 'p1',
            models: [makeModel({ id: 'm1', supportsStreaming: false })],
          }),
        ],
        selectedProviderId: 'p1',
        selectedModelId: 'm1',
      });
      useComposerStore.setState({
        ...useComposerStore.getState(),
        stream: true,
      });
      mockSendRequest.mockResolvedValue({
        response: {
          id: '1',
          model: 'm1',
          content: '',
          role: 'assistant',
          finishReason: 'stop',
          usage: null,
        },
        rawRequest: {},
        rawResponse: {},
        durationMs: 0,
        statusCode: 200,
      });
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({ stream: false }),
        }),
      );
    });
  });

  describe('error handling', () => {
    it('handles RequestError', async () => {
      mockSendRequest.mockRejectedValue(
        new MockRequestError(
          'HTTP 401: Unauthorized',
          401,
          { error: 'bad' },
          { model: 'm1' },
          100,
        ),
      );
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      const state = useResponseStore.getState();
      expect(state.error).toBe('Provider returned HTTP 401');
      expect(state.errorDetail).toBe('bad');
      expect(state.rawRequest).toEqual({ model: 'm1' });
      expect(state.rawResponse).toEqual({ error: 'bad' });
      expect(state.durationMs).toBe(100);
      expect(state.statusCode).toBe(401);
      expect(state.isLoading).toBe(false);
      // Also saves to history with error
      expect(mockDb.history.add).toHaveBeenCalled();
    });

    it('handles AbortError', async () => {
      mockSendRequest.mockRejectedValue(
        new DOMException('Aborted', 'AbortError'),
      );
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(useResponseStore.getState().error).toBe('Request cancelled');
      expect(useResponseStore.getState().errorDetail).toBeNull();
    });

    it('handles network-style Error with a clearer message', async () => {
      mockSendRequest.mockRejectedValue(new Error('Load failed'));
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      const state = useResponseStore.getState();
      expect(state.error).toBe(
        'Network request failed before the provider responded',
      );
      expect(state.errorDetail).toContain('Load failed');
      expect(state.rawResponse).toEqual(
        expect.objectContaining({
          type: 'network_error',
          message: 'Load failed',
        }),
      );
    });

    it('handles generic Error', async () => {
      mockSendRequest.mockRejectedValue(new Error('Network failed'));
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(useResponseStore.getState().error).toBe(
        'Unexpected request error',
      );
      expect(useResponseStore.getState().errorDetail).toBe('Network failed');
    });

    it('handles non-Error thrown values', async () => {
      mockSendRequest.mockRejectedValue('string error');
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      expect(useResponseStore.getState().error).toBe('Unknown error');
      expect(useResponseStore.getState().errorDetail).toBe('string error');
    });
  });

  describe('streaming', () => {
    it('calls onStreamChunk callback during streaming', async () => {
      mockSendRequest.mockImplementation(
        async (options: {
          onStreamChunk?: (chunk: { content: string }) => void;
        }) => {
          options.onStreamChunk?.({ content: 'Hello' });
          options.onStreamChunk?.({ content: ' World' });
          return {
            response: {
              id: '1',
              model: 'm1',
              content: 'Hello World',
              role: 'assistant',
              finishReason: 'stop',
              usage: null,
            },
            rawRequest: {},
            rawResponse: {},
            durationMs: 100,
            statusCode: 200,
          };
        },
      );
      useComposerStore.setState({
        ...useComposerStore.getState(),
        stream: true,
      });
      const { result } = renderHook(() => useSendRequest());

      await act(async () => {
        await result.current.send();
      });

      const state = useResponseStore.getState();
      expect(state.streamingContent).toBe('Hello World');
      expect(state.isStreaming).toBe(false); // finally block sets it to false
    });
  });

  describe('cancel', () => {
    it('aborts the request', async () => {
      mockSendRequest.mockImplementation(
        (options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );

      const { result } = renderHook(() => useSendRequest());

      let sendPromise: Promise<void>;
      act(() => {
        sendPromise = result.current.send();
      });

      act(() => {
        result.current.cancel();
      });

      await act(async () => {
        await sendPromise!;
      });

      expect(useResponseStore.getState().error).toBe('Request cancelled');
    });
  });
});
