import { sendRequest } from './llm-client';
import {
  createAnthropicStreamChunks,
  createOpenAIStreamChunks,
  MockHttpServer,
} from '@/__tests__/mock-server';
import {
  makeAnthropicResponse,
  makeGeminiResponse,
  makeOpenAIResponse,
  makeProvider,
  makeRequest,
} from '@/__tests__/fixtures';

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(() => false),
}));

describe('llm-client integration (mock server)', () => {
  let server: MockHttpServer;

  beforeEach(async () => {
    vi.stubEnv('DEV', false);
    server = new MockHttpServer();
    await server.listen();
  });

  afterEach(async () => {
    await server.close();
    vi.unstubAllEnvs();
  });

  function openAiProvider() {
    return makeProvider({
      baseUrl: `${server.url}/v1`,
      endpoints: { chat: '/chat/completions', responses: '/responses' },
    });
  }

  function anthropicProvider() {
    return makeProvider({
      type: 'anthropic',
      protocol: 'anthropic-messages',
      baseUrl: `${server.url}/v1`,
      endpoints: { chat: '/messages', responses: '/responses' },
      models: [
        {
          id: 'claude-sonnet-4-20250514',
          name: 'claude-sonnet-4-20250514',
          displayName: 'Claude Sonnet 4',
          supportsStreaming: true,
          source: 'manual',
        },
      ],
    });
  }

  function geminiProvider() {
    return makeProvider({
      type: 'google-gemini',
      protocol: 'gemini-generate-content',
      baseUrl: `${server.url}/v1beta`,
      endpoints: { chat: '/models', responses: '/models' },
      models: [
        {
          id: 'gemini-2.0-flash',
          name: 'gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          supportsStreaming: true,
          source: 'manual',
        },
      ],
    });
  }

  describe('OpenAI-compatible provider', () => {
    it('sends chat completion request and parses JSON response', async () => {
      server.on('POST', '/v1/chat/completions', (req) => {
        expect(req.body).toMatchObject({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
        });
        expect(req.headers.authorization).toBe('Bearer test-key');

        return { json: makeOpenAIResponse() };
      });

      const result = await sendRequest({
        provider: openAiProvider(),
        request: makeRequest({ stream: false }),
      });

      expect(server.requests).toHaveLength(1);
      expect(result.statusCode).toBe(200);
      expect(result.response.content).toBe('Hello there!');
      expect(result.response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
      expect(result.requestUrl).toBe(`${server.url}/v1/chat/completions`);
    });

    it('streams SSE chunks into a reconstructed response', async () => {
      server.on('POST', '/v1/chat/completions', (req) => {
        expect(req.body).toMatchObject({ stream: true });

        return {
          sse: createOpenAIStreamChunks(['Hello', ' world'], {
            model: 'gpt-4',
          }),
        };
      });

      const chunks: string[] = [];
      const result = await sendRequest({
        provider: openAiProvider(),
        request: makeRequest({ stream: true }),
        onStreamChunk: (chunk) => {
          if (chunk.content) chunks.push(chunk.content);
        },
      });

      expect(chunks).toEqual(['Hello', ' world']);
      expect(result.response.content).toBe('Hello world');
      expect(result.statusCode).toBe(200);
    });

    it('throws RequestError when provider returns HTTP 401', async () => {
      server.on('POST', '/v1/chat/completions', () => ({
        status: 401,
        json: {
          error: { message: 'Invalid API key', type: 'invalid_request_error' },
        },
      }));

      await expect(
        sendRequest({
          provider: openAiProvider(),
          request: makeRequest({ stream: false }),
        }),
      ).rejects.toMatchObject({
        name: 'RequestError',
        status: 401,
        message: expect.stringContaining('HTTP 401'),
        rawRequest: expect.objectContaining({ model: 'gpt-4' }),
      });
    });
  });

  describe('Anthropic provider', () => {
    it('sends messages request with anthropic headers and parses response', async () => {
      server.on('POST', '/v1/messages', (req) => {
        expect(req.body).toMatchObject({
          model: 'claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
        });
        expect(req.headers.authorization).toBe('Bearer test-key');
        expect(req.headers['anthropic-version']).toBe('2023-06-01');

        return { json: makeAnthropicResponse() };
      });

      const result = await sendRequest({
        provider: anthropicProvider(),
        request: makeRequest({
          model: 'claude-sonnet-4-20250514',
          stream: false,
        }),
      });

      expect(result.response.content).toBe('Hello there!');
      expect(result.requestUrl).toBe(`${server.url}/v1/messages`);
    });

    it('streams anthropic SSE events', async () => {
      server.on('POST', '/v1/messages', () => ({
        sse: createAnthropicStreamChunks('Hi from Claude', {
          model: 'claude-sonnet-4-20250514',
        }),
      }));

      const result = await sendRequest({
        provider: anthropicProvider(),
        request: makeRequest({
          model: 'claude-sonnet-4-20250514',
          stream: true,
        }),
      });

      expect(result.response.content).toBe('Hi from Claude');
    });
  });

  describe('Gemini provider', () => {
    it('hits generateContent endpoint and parses response', async () => {
      server.on(
        'POST',
        /\/v1beta\/models\/gemini-2\.0-flash:generateContent$/,
        (req) => {
          expect(req.body).toMatchObject({
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
          });

          return { json: makeGeminiResponse() };
        },
      );

      const result = await sendRequest({
        provider: geminiProvider(),
        request: makeRequest({
          model: 'gemini-2.0-flash',
          stream: false,
        }),
      });

      expect(result.response.content).toBe('Hello there!');
    });
  });

  describe('error handling', () => {
    it('throws RequestError for invalid JSON bodies', async () => {
      server.on('POST', '/v1/chat/completions', () => ({
        text: 'not-json',
      }));

      await expect(
        sendRequest({
          provider: openAiProvider(),
          request: makeRequest({ stream: false }),
        }),
      ).rejects.toMatchObject({
        name: 'RequestError',
        message: 'Provider returned invalid JSON',
      });
    });
  });
});
