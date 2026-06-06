import { runJudge, parseJudgeContent } from './judge-runner';
import type {
  EvalRunner,
  EvalRunResult,
  EvalSharedRequest,
  JudgeConfig,
} from '@/types/eval';
import { emptyResult } from '@/types/eval';
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

function makeRunner(id: string): EvalRunner {
  return {
    id,
    providerId: 'p1',
    providerName: 'TestProvider',
    modelId: 'm1',
    label: `TestProvider / ${id}`,
  };
}

function makeResult(id: string, content: string): EvalRunResult {
  return {
    ...emptyResult(id),
    status: 'success',
    content,
  };
}

function makeConfig(overrides?: Partial<JudgeConfig>): JudgeConfig {
  return {
    enabled: true,
    runner: { providerId: 'judge', modelId: 'judge-m' },
    rubric: '',
    ...overrides,
  };
}

function makeRequest(): EvalSharedRequest {
  return {
    messages: [{ role: 'user', content: 'Explain JIT compilation.' }],
    systemPrompt: '',
    temperature: 1,
    maxTokens: 1024,
    topP: 1,
    topK: 0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stream: false,
    customHeaders: [],
  };
}

describe('parseJudgeContent', () => {
  const candidates = [
    { runner: makeRunner('r1'), result: makeResult('r1', 'answer 1') },
    { runner: makeRunner('r2'), result: makeResult('r2', 'answer 2') },
  ];

  it('parses a clean JSON object', () => {
    const content = JSON.stringify({
      scores: {
        r1: {
          helpfulness: 4,
          accuracy: 5,
          clarity: 3,
          overall: 4,
          rationale: 'Solid',
        },
        r2: {
          helpfulness: 2,
          accuracy: 3,
          clarity: 2,
          overall: 2,
          rationale: 'Vague',
        },
      },
      winner: 'r1',
    });
    const parsed = parseJudgeContent(content, candidates);
    expect(parsed.winnerRunnerId).toBe('r1');
    expect(parsed.scores.r1.overall).toBe(4);
    expect(parsed.scores.r2.rationale).toBe('Vague');
    expect(parsed.error).toBeNull();
  });

  it('strips ```json code fences', () => {
    const content = '```json\n{ "scores": {}, "winner": "r1" }\n```';
    const parsed = parseJudgeContent(content, candidates);
    expect(parsed.winnerRunnerId).toBe('r1');
    expect(parsed.error).toBeNull();
  });

  it('clamps numeric scores into 1-5', () => {
    const content = JSON.stringify({
      scores: {
        r1: {
          helpfulness: 9,
          accuracy: 0,
          clarity: 3.6,
          overall: 100,
          rationale: 'oops',
        },
      },
      winner: 'unknown',
    });
    const parsed = parseJudgeContent(content, candidates);
    expect(parsed.scores.r1.helpfulness).toBe(5);
    expect(parsed.scores.r1.accuracy).toBe(1);
    expect(parsed.scores.r1.clarity).toBe(3.6);
    expect(parsed.scores.r1.overall).toBe(5);
    // unknown winner is rejected
    expect(parsed.winnerRunnerId).toBeNull();
  });

  it('returns an error for non-JSON content', () => {
    const parsed = parseJudgeContent('this is not json', candidates);
    expect(parsed.error).toBe('Judge returned non-JSON content');
    expect(parsed.scores).toEqual({});
  });

  it('returns an error for malformed JSON', () => {
    const parsed = parseJudgeContent('{ "scores": invalid }', candidates);
    expect(parsed.error).toMatch(/parse judge JSON/i);
  });

  it('derives overall from other scores when missing', () => {
    const content = JSON.stringify({
      scores: {
        r1: { helpfulness: 4, accuracy: 4, clarity: 4, rationale: '' },
      },
    });
    const parsed = parseJudgeContent(content, candidates);
    expect(parsed.scores.r1.overall).toBe(4);
  });
});

describe('runJudge', () => {
  const judgeProvider = makeProvider({
    id: 'judge',
    name: 'Judge',
    models: [makeModel({ id: 'judge-m' })],
    apiKey: 'k',
  });
  const candidateProvider = makeProvider({
    id: 'p1',
    models: [makeModel({ id: 'm1' })],
    apiKey: 'k',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns no-op result when disabled', async () => {
    const handle = runJudge({
      config: makeConfig({ enabled: false }),
      providers: [judgeProvider, candidateProvider],
      request: makeRequest(),
      runners: [makeRunner('r1')],
      results: [makeResult('r1', 'a')],
    });
    const result = await handle.promise;
    expect(result.error).toBe('Judge not enabled');
    expect(mockSendRequest).not.toHaveBeenCalled();
  });

  it('returns error when judge provider is missing', async () => {
    const handle = runJudge({
      config: makeConfig(),
      providers: [candidateProvider],
      request: makeRequest(),
      runners: [makeRunner('r1')],
      results: [makeResult('r1', 'a')],
    });
    const result = await handle.promise;
    expect(result.error).toBe('Judge provider not found');
  });

  it('returns error when there are no successful candidates', async () => {
    const failedResult: EvalRunResult = {
      ...emptyResult('r1'),
      status: 'error',
      error: 'boom',
    };
    const handle = runJudge({
      config: makeConfig(),
      providers: [judgeProvider, candidateProvider],
      request: makeRequest(),
      runners: [makeRunner('r1')],
      results: [failedResult],
    });
    const result = await handle.promise;
    expect(result.error).toMatch(/no successful candidate/i);
  });

  it('sends a judge request with the candidates and parses the response', async () => {
    mockSendRequest.mockResolvedValueOnce({
      response: {
        id: 'j',
        model: 'judge-m',
        content: JSON.stringify({
          scores: {
            r1: {
              helpfulness: 5,
              accuracy: 5,
              clarity: 5,
              overall: 5,
              rationale: 'best',
            },
            r2: {
              helpfulness: 2,
              accuracy: 2,
              clarity: 2,
              overall: 2,
              rationale: 'meh',
            },
          },
          winner: 'r1',
        }),
        role: 'assistant',
        finishReason: 'stop',
        usage: null,
      },
      rawRequest: {},
      rawResponse: {},
      requestUrl: 'https://example.com',
      requestHeaders: {},
      responseHeaders: {},
      durationMs: 100,
      statusCode: 200,
    });

    const handle = runJudge({
      config: makeConfig(),
      providers: [judgeProvider, candidateProvider],
      request: makeRequest(),
      runners: [makeRunner('r1'), makeRunner('r2')],
      results: [makeResult('r1', 'best'), makeResult('r2', 'meh')],
    });

    const result = await handle.promise;
    expect(result.error).toBeNull();
    expect(result.winnerRunnerId).toBe('r1');
    expect(result.scores.r1.overall).toBe(5);
    expect(mockSendRequest).toHaveBeenCalledTimes(1);
    const callArgs = mockSendRequest.mock.calls[0][0];
    expect(callArgs.provider.id).toBe('judge');
    expect(callArgs.request.model).toBe('judge-m');
    expect(callArgs.request.stream).toBe(false);
    expect(callArgs.request.messages[0].role).toBe('system');
    expect(callArgs.request.messages[1].content).toContain('Candidate A');
    expect(callArgs.request.messages[1].content).toContain('id: r1');
  });

  it('cancels via handle.cancel()', async () => {
    mockSendRequest.mockImplementation(async ({ signal }) => {
      return new Promise((_resolve, reject) => {
        const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    });

    const handle = runJudge({
      config: makeConfig(),
      providers: [judgeProvider, candidateProvider],
      request: makeRequest(),
      runners: [makeRunner('r1')],
      results: [makeResult('r1', 'best')],
    });
    handle.cancel();
    const result = await handle.promise;
    expect(result.error).toBe('Judge run cancelled');
  });

  it('reports RequestError details', async () => {
    mockSendRequest.mockRejectedValueOnce(
      new MockRequestError(
        'HTTP 500',
        500,
        {},
        {},
        {},
        {},
        'https://example.com',
        10,
      ),
    );

    const handle = runJudge({
      config: makeConfig(),
      providers: [judgeProvider, candidateProvider],
      request: makeRequest(),
      runners: [makeRunner('r1')],
      results: [makeResult('r1', 'best')],
    });
    const result = await handle.promise;
    expect(result.error).toContain('Judge call failed');
    expect(result.error).toContain('HTTP 500');
  });
});
