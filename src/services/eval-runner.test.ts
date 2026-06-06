import { runEval } from './eval-runner';
import type { EvalRunner, EvalSharedRequest } from '@/types/eval';
import { makeProvider, makeModel } from '@/__tests__/fixtures';

const { mockSendRequest, MockRequestError } = vi.hoisted(() => {
  const mockSendRequest = vi.fn();
  class MockRequestError extends Error {
    status: number;
    rawResponse: Record<string, unknown>;
    rawRequest: Record<string, unknown>;
    requestHeaders: Record<string, string>;
    responseHeaders: Record<string, string>;
    requestUrl: string;
    durationMs: number;
    constructor(
      message: string,
      status: number,
      rawResponse: Record<string, unknown>,
      rawRequest: Record<string, unknown>,
      requestHeaders: Record<string, string>,
      responseHeaders: Record<string, string>,
      requestUrl: string,
      durationMs: number,
    ) {
      super(message);
      this.name = 'RequestError';
      this.status = status;
      this.rawResponse = rawResponse;
      this.rawRequest = rawRequest;
      this.requestHeaders = requestHeaders;
      this.responseHeaders = responseHeaders;
      this.requestUrl = requestUrl;
      this.durationMs = durationMs;
    }
  }
  return { mockSendRequest, MockRequestError };
});

vi.mock('@/services/llm-client', () => ({
  sendRequest: mockSendRequest,
  RequestError: MockRequestError,
}));

function makeRunner(overrides?: Partial<EvalRunner>): EvalRunner {
  return {
    id: 'runner-1',
    providerId: 'p1',
    providerName: 'TestProvider',
    modelId: 'm1',
    label: 'TestProvider / m1',
    ...overrides,
  };
}

function makeRequest(): EvalSharedRequest {
  return {
    messages: [{ role: 'user', content: 'Hello' }],
    systemPrompt: '',
    temperature: 1,
    maxTokens: 1024,
    topP: 1,
    topK: 0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stream: true,
    customHeaders: [],
  };
}

const baseProvider = makeProvider({
  id: 'p1',
  models: [
    makeModel({
      id: 'm1',
      pricing: { inputPerMTokens: 5, outputPerMTokens: 15 },
    }),
  ],
});

describe('runEval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fans out to all runners and reports per-runner success', async () => {
    mockSendRequest.mockImplementation(async ({ request }) => ({
      response: {
        id: 'resp',
        model: request.model,
        content: `answer-${request.model}`,
        role: 'assistant',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      },
      rawRequest: {},
      rawResponse: {},
      requestUrl: 'https://example.com',
      requestHeaders: {},
      responseHeaders: {},
      durationMs: 500,
      statusCode: 200,
    }));

    const updates: string[] = [];
    const handle = runEval({
      runners: [
        makeRunner({ id: 'r1', modelId: 'm1' }),
        makeRunner({ id: 'r2', modelId: 'm1' }),
      ],
      providers: [baseProvider],
      request: makeRequest(),
      onUpdate: (u) => updates.push(`${u.runnerId}:${u.result.status}`),
    });

    const results = await handle.promise;
    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.status).toBe('success');
      expect(result.content).toBe('answer-m1');
      expect(result.metrics.promptTokens).toBe(10);
      expect(result.metrics.completionTokens).toBe(20);
      expect(result.metrics.totalTokens).toBe(30);
      expect(result.metrics.statusCode).toBe(200);
      expect(result.metrics.finishReason).toBe('stop');
      // 10 input * $5/1M + 20 output * $15/1M = $0.00005 + $0.0003 = $0.00035
      expect(result.metrics.costUsd).toBeCloseTo(0.00035, 8);
      expect(result.metrics.tokensPerSec).not.toBeNull();
    }
    expect(updates).toContain('r1:success');
    expect(updates).toContain('r2:success');
  });

  it('captures time to first token from streaming chunks', async () => {
    let now = 1000;
    const performanceSpy = vi
      .spyOn(performance, 'now')
      .mockImplementation(() => now);

    mockSendRequest.mockImplementation(async ({ onStreamChunk }) => {
      now = 1100; // 100 ms after start, first chunk arrives
      onStreamChunk?.({ content: 'Hel', finishReason: null });
      now = 1300; // last chunk later
      onStreamChunk?.({ content: 'lo', finishReason: 'stop' });
      now = 1500; // total duration ~ 500 ms
      return {
        response: {
          id: 'r',
          model: 'm1',
          content: 'Hello',
          role: 'assistant',
          finishReason: 'stop',
          usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
        },
        rawRequest: {},
        rawResponse: {},
        requestUrl: 'https://example.com',
        requestHeaders: {},
        responseHeaders: {},
        durationMs: 500,
        statusCode: 200,
      };
    });

    const handle = runEval({
      runners: [makeRunner({ id: 'r1' })],
      providers: [baseProvider],
      request: makeRequest(),
      onUpdate: () => {},
    });

    const [result] = await handle.promise;
    expect(result.metrics.ttftMs).toBe(100);
    // tokens/sec uses (durationMs - ttftMs) = 400 ms when ttft known
    // 5 completion / 0.4s = 12.5 tps
    expect(result.metrics.tokensPerSec).toBeCloseTo(12.5, 6);

    performanceSpy.mockRestore();
  });

  it('records errors per runner without aborting others', async () => {
    mockSendRequest.mockImplementationOnce(async () => {
      throw new MockRequestError(
        'HTTP 401: unauthorized',
        401,
        { error: 'unauthorized' },
        {},
        {},
        {},
        'https://example.com',
        50,
      );
    });
    mockSendRequest.mockImplementationOnce(async () => ({
      response: {
        id: 'r2',
        model: 'm1',
        content: 'ok',
        role: 'assistant',
        finishReason: 'stop',
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      },
      rawRequest: {},
      rawResponse: {},
      requestUrl: 'https://example.com',
      requestHeaders: {},
      responseHeaders: {},
      durationMs: 250,
      statusCode: 200,
    }));

    const handle = runEval({
      runners: [makeRunner({ id: 'r1' }), makeRunner({ id: 'r2' })],
      providers: [baseProvider],
      request: makeRequest(),
      onUpdate: () => {},
    });

    const results = await handle.promise;
    const failed = results.find((r) => r.runnerId === 'r1');
    const ok = results.find((r) => r.runnerId === 'r2');
    expect(failed?.status).toBe('error');
    expect(failed?.metrics.statusCode).toBe(401);
    expect(failed?.error).toContain('401');
    expect(ok?.status).toBe('success');
  });

  it('marks unknown providers as error without calling sendRequest', async () => {
    const handle = runEval({
      runners: [makeRunner({ id: 'r1', providerId: 'missing' })],
      providers: [baseProvider],
      request: makeRequest(),
      onUpdate: () => {},
    });

    const [result] = await handle.promise;
    expect(result.status).toBe('error');
    expect(result.error).toContain('Provider not found');
    expect(mockSendRequest).not.toHaveBeenCalled();
  });

  it('cancels in-flight runners and marks them cancelled', async () => {
    mockSendRequest.mockImplementation(async ({ signal }) => {
      return new Promise((_resolve, reject) => {
        const onAbort = () => {
          reject(new DOMException('aborted', 'AbortError'));
        };
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    });

    const handle = runEval({
      runners: [makeRunner({ id: 'r1' }), makeRunner({ id: 'r2' })],
      providers: [baseProvider],
      request: makeRequest(),
      onUpdate: () => {},
    });
    handle.cancel();
    const results = await handle.promise;
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === 'cancelled')).toBe(true);
  });

  it('exposes per-runner AbortControllers via registerController', async () => {
    const registered: Record<string, AbortController> = {};
    mockSendRequest.mockImplementation(async ({ signal }) => {
      return new Promise((_resolve, reject) => {
        const onAbort = () => {
          reject(new DOMException('aborted', 'AbortError'));
        };
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    });

    const handle = runEval({
      runners: [makeRunner({ id: 'r1' }), makeRunner({ id: 'r2' })],
      providers: [baseProvider],
      request: makeRequest(),
      onUpdate: () => {},
      registerController: (id, controller) => {
        registered[id] = controller;
      },
    });

    registered.r1.abort();
    setTimeout(() => handle.cancel(), 0);
    const results = await handle.promise;
    expect(results.find((r) => r.runnerId === 'r1')?.status).toBe('cancelled');
    expect(results.find((r) => r.runnerId === 'r2')?.status).toBe('cancelled');
  });
});
