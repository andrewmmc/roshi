import { sendRequest, RequestError } from './llm-client';
import { makeProvider, makeRequest } from '@/__tests__/fixtures';
import type { ProviderAdapter } from '@/adapters/types';

vi.mock('@/adapters', () => ({
  getAdapter: vi.fn(),
}));

import { getAdapter } from '@/adapters';

function createMockAdapter(
  overrides?: Partial<ProviderAdapter>,
): ProviderAdapter {
  return {
    buildRequestUrl: vi
      .fn()
      .mockReturnValue('https://api.test.com/v1/chat/completions'),
    buildRequestHeaders: vi.fn().mockReturnValue({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test',
    }),
    buildRequestBody: vi.fn().mockReturnValue({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    }),
    parseResponse: vi.fn().mockReturnValue({
      id: 'chatcmpl-123',
      model: 'gpt-4',
      content: 'Hello there!',
      role: 'assistant',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    }),
    parseStreamChunk: vi.fn().mockReturnValue(null),
    ...overrides,
  };
}

function createSSEStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }
      controller.close();
    },
  });
}

describe('llm-client', () => {
  let mockAdapter: ProviderAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('DEV', '');
    mockAdapter = createMockAdapter();
    vi.mocked(getAdapter).mockReturnValue(mockAdapter);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('RequestError', () => {
    it('extends Error with correct properties', () => {
      const err = new RequestError(
        'test error',
        400,
        { error: 'bad' },
        { model: 'gpt-4' },
        100,
      );

      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('RequestError');
      expect(err.message).toBe('test error');
      expect(err.status).toBe(400);
      expect(err.rawResponse).toEqual({ error: 'bad' });
      expect(err.rawRequest).toEqual({ model: 'gpt-4' });
      expect(err.durationMs).toBe(100);
    });
  });

  describe('sendRequest — non-streaming', () => {
    it('returns parsed response on success', async () => {
      const rawResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [{ message: { content: 'Hi' } }],
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(rawResponse),
        }),
      );
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(150);

      const result = await sendRequest({
        provider: makeProvider(),
        request: makeRequest({ stream: false }),
      });

      expect(result.statusCode).toBe(200);
      expect(result.durationMs).toBe(150);
      expect(result.rawResponse).toBe(rawResponse);
      expect(result.response.content).toBe('Hello there!');
    });

    it('calls adapter methods in order', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        }),
      );

      const provider = makeProvider();
      const request = makeRequest();
      await sendRequest({
        provider,
        request,
        customHeaders: { 'X-Test': '1' },
      });

      expect(mockAdapter.buildRequestUrl).toHaveBeenCalledWith(provider);
      expect(mockAdapter.buildRequestHeaders).toHaveBeenCalledWith(provider, {
        'X-Test': '1',
      });
      expect(mockAdapter.buildRequestBody).toHaveBeenCalledWith(
        request,
        provider,
      );
      expect(mockAdapter.parseResponse).toHaveBeenCalled();
    });

    it('sends POST with correct body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      await sendRequest({ provider: makeProvider(), request: makeRequest() });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        }),
      );
    });

    it('passes signal to fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);
      const controller = new AbortController();

      await sendRequest({
        provider: makeProvider(),
        request: makeRequest(),
        signal: controller.signal,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );

      // Aborting the user signal should abort the combined signal
      const combinedSignal = mockFetch.mock.calls[0][1].signal as AbortSignal;
      expect(combinedSignal.aborted).toBe(false);
      controller.abort();
      expect(combinedSignal.aborted).toBe(true);
    });

    it('throws RequestError with JSON error body', async () => {
      const errorJson = { error: { message: 'Invalid key' } };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve(JSON.stringify(errorJson)),
        }),
      );
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(100);

      try {
        await sendRequest({ provider: makeProvider(), request: makeRequest() });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RequestError);
        const reqErr = err as RequestError;
        expect(reqErr.status).toBe(401);
        expect(reqErr.rawResponse).toEqual(errorJson);
        expect(reqErr.durationMs).toBe(100);
      }
    });

    it('throws RequestError with text error body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        }),
      );

      try {
        await sendRequest({ provider: makeProvider(), request: makeRequest() });
        expect.fail('should have thrown');
      } catch (err) {
        const reqErr = err as RequestError;
        expect(reqErr.rawResponse).toEqual({ error: 'Internal Server Error' });
      }
    });
  });

  describe('sendRequest — streaming', () => {
    it('accumulates content from stream chunks', async () => {
      const chunk1 = JSON.stringify({
        id: 'chatcmpl-1',
        model: 'gpt-4',
        choices: [{ delta: { content: 'Hello' }, finish_reason: null }],
      });
      const chunk2 = JSON.stringify({
        id: 'chatcmpl-1',
        model: 'gpt-4',
        choices: [{ delta: { content: ' world' }, finish_reason: 'stop' }],
      });
      const chunkUsage = JSON.stringify({
        id: 'chatcmpl-1',
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      mockAdapter = createMockAdapter({
        parseStreamChunk: vi
          .fn()
          .mockReturnValueOnce({
            content: 'Hello',
            finishReason: null,
            model: 'gpt-4',
            id: 'chatcmpl-1',
          })
          .mockReturnValueOnce({
            content: ' world',
            finishReason: 'stop',
            model: 'gpt-4',
            id: 'chatcmpl-1',
          })
          .mockReturnValueOnce({
            content: '',
            finishReason: null,
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          }),
      });
      vi.mocked(getAdapter).mockReturnValue(mockAdapter);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          body: createSSEStream([chunk1, chunk2, chunkUsage, '[DONE]']),
        }),
      );
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(200);

      const chunks: unknown[] = [];
      const result = await sendRequest({
        provider: makeProvider(),
        request: makeRequest({ stream: true }),
        onStreamChunk: (c) => chunks.push(c),
      });

      expect(result.response.content).toBe('Hello world');
      expect(result.response.finishReason).toBe('stop');
      expect(result.response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
      expect(result.durationMs).toBe(200);
      expect(chunks).toHaveLength(3);
      expect(result.rawResponse).toHaveProperty('chunks');
      expect(result.rawResponse).toHaveProperty('reconstructed');
    });

    it('skips [DONE] and empty data events', async () => {
      mockAdapter = createMockAdapter({
        parseStreamChunk: vi.fn().mockReturnValue({
          content: 'Hi',
          finishReason: 'stop',
          model: 'gpt-4',
          id: '1',
        }),
      });
      vi.mocked(getAdapter).mockReturnValue(mockAdapter);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          body: createSSEStream([
            JSON.stringify({
              id: '1',
              choices: [{ delta: { content: 'Hi' }, finish_reason: 'stop' }],
            }),
            '[DONE]',
          ]),
        }),
      );

      const result = await sendRequest({
        provider: makeProvider(),
        request: makeRequest({ stream: true }),
      });

      // parseStreamChunk should be called only once (not for [DONE])
      expect(mockAdapter.parseStreamChunk).toHaveBeenCalledTimes(1);
      expect(result.response.content).toBe('Hi');
    });
  });

  describe('getRequestUrl — dev proxy', () => {
    it('proxies URL when DEV is true', async () => {
      vi.stubEnv('DEV', 'true');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      await sendRequest({ provider: makeProvider(), request: makeRequest() });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toMatch(/^\/api\/proxy\?url=/);
      expect(calledUrl).toContain(
        encodeURIComponent('https://api.test.com/v1/chat/completions'),
      );
    });

    it('does not proxy when DEV is falsy', async () => {
      vi.stubEnv('DEV', '');
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      await sendRequest({ provider: makeProvider(), request: makeRequest() });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toBe('https://api.test.com/v1/chat/completions');
    });
  });
});
