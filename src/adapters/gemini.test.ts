import { geminiAdapter } from './gemini';
import {
  makeProvider,
  makeRequest,
  makeMessage,
  makeGeminiResponse,
} from '@/__tests__/fixtures';

const geminiProvider = () =>
  makeProvider({
    type: 'google-gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    auth: { type: 'api-key-header', headerName: 'x-goog-api-key' },
    apiKey: 'test-gemini-key',
    endpoints: { chat: '/v1beta/models' },
  });

describe('geminiAdapter', () => {
  describe('buildRequestBody', () => {
    it('builds basic request body with contents', () => {
      const request = makeRequest({
        model: 'gemini-2.0-flash',
        stream: false,
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());

      expect(body.contents).toEqual([
        { role: 'user', parts: [{ text: 'Hello' }] },
      ]);
      expect(body.model).toBeUndefined();
      expect(body.stream).toBeUndefined();
    });

    it('sets system prompt as systemInstruction', () => {
      const request = makeRequest({ systemPrompt: 'You are helpful.' });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());

      expect(body.systemInstruction).toEqual({
        parts: [{ text: 'You are helpful.' }],
      });
    });

    it('omits systemInstruction when systemPrompt is empty', () => {
      const request = makeRequest({ systemPrompt: '' });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      expect(body.systemInstruction).toBeUndefined();
    });

    it('maps assistant role to model', () => {
      const request = makeRequest({
        messages: [
          makeMessage({ role: 'user', content: 'Hi' }),
          makeMessage({ role: 'assistant', content: 'Hello!' }),
          makeMessage({ role: 'user', content: 'How are you?' }),
        ],
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      const contents = body.contents as Array<{
        role: string;
        parts: unknown[];
      }>;

      expect(contents[0].role).toBe('user');
      expect(contents[1].role).toBe('model');
      expect(contents[2].role).toBe('user');
    });

    it('filters out system messages from contents', () => {
      const request = makeRequest({
        messages: [
          makeMessage({ role: 'system', content: 'System msg' }),
          makeMessage({ role: 'user', content: 'Hi' }),
        ],
        systemPrompt: 'System msg',
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      const contents = body.contents as Array<{
        role: string;
        parts: unknown[];
      }>;

      expect(contents).toHaveLength(1);
      expect(contents[0].role).toBe('user');
    });

    it('builds generationConfig with parameters', () => {
      const request = makeRequest({
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxTokens: 2048,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      const config = body.generationConfig as Record<string, unknown>;

      expect(config.temperature).toBe(0.7);
      expect(config.topP).toBe(0.9);
      expect(config.topK).toBe(40);
      expect(config.maxOutputTokens).toBe(2048);
      expect(config.frequencyPenalty).toBe(0.5);
      expect(config.presencePenalty).toBe(0.3);
    });

    it('omits generationConfig when no params set', () => {
      const request = makeRequest({
        temperature: undefined,
        topP: undefined,
        topK: undefined,
        maxTokens: undefined,
        frequencyPenalty: undefined,
        presencePenalty: undefined,
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      expect(body.generationConfig).toBeUndefined();
    });

    it('omits topK when 0', () => {
      const request = makeRequest({
        topK: 0,
        temperature: 1,
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      const config = body.generationConfig as Record<string, unknown>;
      expect(config.topK).toBeUndefined();
    });

    it('includes thinking config when enabled', () => {
      const request = makeRequest({
        thinking: { enabled: true, budgetTokens: 10240 },
        temperature: 1,
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      const config = body.generationConfig as Record<string, unknown>;

      expect(config.thinkingConfig).toEqual({ thinkingBudget: 10240 });
    });

    it('omits thinking config when not enabled', () => {
      const request = makeRequest({
        thinking: { enabled: false, budgetTokens: 10240 },
        temperature: 1,
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      const config = body.generationConfig as Record<string, unknown>;

      expect(config.thinkingConfig).toBeUndefined();
    });

    it('handles base64 image attachments as inlineData', () => {
      const request = makeRequest({
        messages: [
          makeMessage({
            content: 'Describe this',
            attachments: [
              {
                id: 'a1',
                filename: 'photo.png',
                mimeType: 'image/png',
                data: 'data:image/png;base64,abc123',
              },
            ],
          }),
        ],
      });
      const body = geminiAdapter.buildRequestBody(request, geminiProvider());
      const contents = body.contents as Array<{
        role: string;
        parts: unknown[];
      }>;

      expect(contents[0].parts).toEqual([
        { text: 'Describe this' },
        { inlineData: { mimeType: 'image/png', data: 'abc123' } },
      ]);
    });
  });

  describe('buildRequestHeaders', () => {
    it('sets x-goog-api-key header', () => {
      const provider = geminiProvider();
      const headers = geminiAdapter.buildRequestHeaders(provider);

      expect(headers['x-goog-api-key']).toBe('test-gemini-key');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('supports bearer auth', () => {
      const provider = geminiProvider();
      provider.auth = { type: 'bearer' };
      const headers = geminiAdapter.buildRequestHeaders(provider);

      expect(headers['Authorization']).toBe('Bearer test-gemini-key');
      expect(headers['x-goog-api-key']).toBeUndefined();
    });

    it('merges custom headers', () => {
      const provider = geminiProvider();
      const headers = geminiAdapter.buildRequestHeaders(provider, {
        'X-Custom': 'value',
      });

      expect(headers['X-Custom']).toBe('value');
      expect(headers['x-goog-api-key']).toBe('test-gemini-key');
    });
  });

  describe('buildRequestUrl', () => {
    it('builds non-streaming URL with model in path', () => {
      const provider = geminiProvider();
      const request = makeRequest({
        model: 'gemini-2.0-flash',
        stream: false,
      });
      const url = geminiAdapter.buildRequestUrl(provider, request);

      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      );
    });

    it('builds streaming URL with alt=sse', () => {
      const provider = geminiProvider();
      const request = makeRequest({
        model: 'gemini-2.0-flash',
        stream: true,
      });
      const url = geminiAdapter.buildRequestUrl(provider, request);

      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse',
      );
    });

    it('appends query-param auth key', () => {
      const provider = geminiProvider();
      provider.auth = { type: 'query-param' };
      const request = makeRequest({
        model: 'gemini-2.0-flash',
        stream: false,
      });
      const url = geminiAdapter.buildRequestUrl(provider, request);

      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=test-gemini-key',
      );
    });

    it('appends query-param auth key to streaming URL', () => {
      const provider = geminiProvider();
      provider.auth = { type: 'query-param' };
      const request = makeRequest({
        model: 'gemini-2.0-flash',
        stream: true,
      });
      const url = geminiAdapter.buildRequestUrl(provider, request);

      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=test-gemini-key',
      );
    });

    it('strips trailing slash from baseUrl', () => {
      const provider = geminiProvider();
      provider.baseUrl = 'https://generativelanguage.googleapis.com/';
      const request = makeRequest({
        model: 'gemini-2.0-flash',
        stream: false,
      });
      const url = geminiAdapter.buildRequestUrl(provider, request);

      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      );
    });
  });

  describe('parseResponse', () => {
    it('parses standard Gemini response', () => {
      const raw = makeGeminiResponse();
      const result = geminiAdapter.parseResponse(raw);

      expect(result).toEqual({
        id: 'resp-123',
        model: 'gemini-2.0-flash',
        content: 'Hello there!',
        role: 'assistant',
        finishReason: 'STOP',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
    });

    it('joins multiple text parts', () => {
      const raw = makeGeminiResponse({
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello ' }, { text: 'world!' }],
            },
            finishReason: 'STOP',
          },
        ],
      });
      const result = geminiAdapter.parseResponse(raw);
      expect(result.content).toBe('Hello world!');
    });

    it('skips thought parts', () => {
      const raw = makeGeminiResponse({
        candidates: [
          {
            content: {
              parts: [
                { text: 'thinking...', thought: true },
                { text: 'Hello!' },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      });
      const result = geminiAdapter.parseResponse(raw);
      expect(result.content).toBe('Hello!');
    });

    it('returns null usage when missing', () => {
      const raw = makeGeminiResponse({ usageMetadata: undefined });
      const result = geminiAdapter.parseResponse(raw);
      expect(result.usage).toBeNull();
    });

    it('handles empty candidates', () => {
      const raw = makeGeminiResponse({ candidates: [] });
      const result = geminiAdapter.parseResponse(raw);
      expect(result.content).toBe('');
      expect(result.finishReason).toBeNull();
    });

    it('handles missing candidates', () => {
      const result = geminiAdapter.parseResponse({});
      expect(result.id).toBe('');
      expect(result.model).toBe('');
      expect(result.content).toBe('');
    });
  });

  describe('parseStreamChunk', () => {
    it('parses text content from stream chunk', () => {
      const data = JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Hello' }] } }],
        responseId: 'resp-1',
        modelVersion: 'gemini-2.0-flash',
      });
      const result = geminiAdapter.parseStreamChunk(data);

      expect(result).toEqual({
        content: 'Hello',
        finishReason: null,
        id: 'resp-1',
        model: 'gemini-2.0-flash',
        usage: undefined,
      });
    });

    it('skips thought parts in stream', () => {
      const data = JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                { text: 'thinking...', thought: true },
                { text: 'result' },
              ],
            },
          },
        ],
      });
      const result = geminiAdapter.parseStreamChunk(data);
      expect(result?.content).toBe('result');
    });

    it('parses finish reason', () => {
      const data = JSON.stringify({
        candidates: [
          {
            content: { parts: [{ text: '' }] },
            finishReason: 'MAX_TOKENS',
          },
        ],
      });
      const result = geminiAdapter.parseStreamChunk(data);
      expect(result?.finishReason).toBe('MAX_TOKENS');
    });

    it('parses usage metadata', () => {
      const data = JSON.stringify({
        candidates: [{ content: { parts: [{ text: '' }] } }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      });
      const result = geminiAdapter.parseStreamChunk(data);
      expect(result?.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });

    it('returns null for invalid JSON', () => {
      expect(geminiAdapter.parseStreamChunk('not-json')).toBeNull();
    });
  });
});
