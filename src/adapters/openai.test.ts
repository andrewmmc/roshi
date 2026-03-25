import { openaiAdapter } from './openai';
import { makeProvider, makeRequest, makeMessage, makeOpenAIResponse } from '@/__tests__/fixtures';

describe('openaiAdapter', () => {
  describe('buildRequestBody', () => {
    it('builds basic request body', () => {
      const request = makeRequest({ model: 'gpt-4', stream: false });
      const body = openaiAdapter.buildRequestBody(request);

      expect(body.model).toBe('gpt-4');
      expect(body.stream).toBe(false);
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
      expect(body.stream_options).toBeUndefined();
    });

    it('prepends system prompt as first message', () => {
      const request = makeRequest({ systemPrompt: 'You are helpful.' });
      const body = openaiAdapter.buildRequestBody(request);
      const messages = body.messages as Array<{ role: string; content: string }>;

      expect(messages[0]).toEqual({ role: 'system', content: 'You are helpful.' });
      expect(messages[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('omits system prompt when empty', () => {
      const request = makeRequest({ systemPrompt: '' });
      const body = openaiAdapter.buildRequestBody(request);
      const messages = body.messages as Array<{ role: string; content: string }>;

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
    });

    it('omits system prompt when undefined', () => {
      const request = makeRequest({ systemPrompt: undefined });
      const body = openaiAdapter.buildRequestBody(request);
      const messages = body.messages as Array<{ role: string; content: string }>;

      expect(messages).toHaveLength(1);
    });

    it('includes temperature when defined', () => {
      const body = openaiAdapter.buildRequestBody(makeRequest({ temperature: 0.5 }));
      expect(body.temperature).toBe(0.5);
    });

    it('omits temperature when undefined', () => {
      const body = openaiAdapter.buildRequestBody(makeRequest({ temperature: undefined }));
      expect(body.temperature).toBeUndefined();
    });

    it('includes max_tokens when defined', () => {
      const body = openaiAdapter.buildRequestBody(makeRequest({ maxTokens: 1024 }));
      expect(body.max_tokens).toBe(1024);
    });

    it('omits max_tokens when undefined', () => {
      const body = openaiAdapter.buildRequestBody(makeRequest({ maxTokens: undefined }));
      expect(body.max_tokens).toBeUndefined();
    });

    it('includes stream_options when streaming', () => {
      const body = openaiAdapter.buildRequestBody(makeRequest({ stream: true }));
      expect(body.stream).toBe(true);
      expect(body.stream_options).toEqual({ include_usage: true });
    });

    it('handles messages with attachments', () => {
      const request = makeRequest({
        messages: [
          makeMessage({
            content: 'Look at this',
            attachments: [
              { id: 'a1', filename: 'doc.pdf', mimeType: 'application/pdf', data: 'data:application/pdf;base64,abc' },
            ],
          }),
        ],
      });
      const body = openaiAdapter.buildRequestBody(request);
      const messages = body.messages as Array<{ role: string; content: unknown }>;

      expect(messages[0].content).toEqual([
        { type: 'text', text: 'Look at this' },
        { type: 'file', file: { filename: 'doc.pdf', file_data: 'data:application/pdf;base64,abc' } },
      ]);
    });

    it('handles attachment with empty content', () => {
      const request = makeRequest({
        messages: [
          makeMessage({
            content: '',
            attachments: [
              { id: 'a1', filename: 'doc.pdf', mimeType: 'application/pdf', data: 'data:...' },
            ],
          }),
        ],
      });
      const body = openaiAdapter.buildRequestBody(request);
      const messages = body.messages as Array<{ role: string; content: unknown[] }>;

      // Only the file entry, no text entry
      expect(messages[0].content).toEqual([
        { type: 'file', file: { filename: 'doc.pdf', file_data: 'data:...' } },
      ]);
    });
  });

  describe('buildRequestHeaders', () => {
    it('sets bearer auth header', () => {
      const provider = makeProvider({ auth: { type: 'bearer' }, apiKey: 'sk-123' });
      const headers = openaiAdapter.buildRequestHeaders(provider);

      expect(headers['Authorization']).toBe('Bearer sk-123');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('sets api-key-header with default header name', () => {
      const provider = makeProvider({ auth: { type: 'api-key-header' }, apiKey: 'key-456' });
      const headers = openaiAdapter.buildRequestHeaders(provider);

      expect(headers['x-api-key']).toBe('key-456');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('sets api-key-header with custom header name', () => {
      const provider = makeProvider({
        auth: { type: 'api-key-header', headerName: 'X-Custom-Key' },
        apiKey: 'key-789',
      });
      const headers = openaiAdapter.buildRequestHeaders(provider);

      expect(headers['X-Custom-Key']).toBe('key-789');
      expect(headers['x-api-key']).toBeUndefined();
    });

    it('sets no auth header for type none', () => {
      const provider = makeProvider({ auth: { type: 'none' } });
      const headers = openaiAdapter.buildRequestHeaders(provider);

      expect(headers['Authorization']).toBeUndefined();
      expect(headers['x-api-key']).toBeUndefined();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('merges custom headers', () => {
      const provider = makeProvider({ auth: { type: 'bearer' }, apiKey: 'sk-123' });
      const headers = openaiAdapter.buildRequestHeaders(provider, { 'X-Custom': 'value' });

      expect(headers['X-Custom']).toBe('value');
      expect(headers['Authorization']).toBe('Bearer sk-123');
    });

    it('custom headers can override defaults', () => {
      const provider = makeProvider({ auth: { type: 'bearer' }, apiKey: 'sk-123' });
      const headers = openaiAdapter.buildRequestHeaders(provider, { 'Content-Type': 'text/plain' });

      expect(headers['Content-Type']).toBe('text/plain');
    });
  });

  describe('buildRequestUrl', () => {
    it('constructs URL from baseUrl and endpoint', () => {
      const provider = makeProvider({ baseUrl: 'https://api.test.com/v1', endpoints: { chat: '/chat/completions' } });
      expect(openaiAdapter.buildRequestUrl(provider)).toBe('https://api.test.com/v1/chat/completions');
    });

    it('strips trailing slash from baseUrl', () => {
      const provider = makeProvider({ baseUrl: 'https://api.test.com/v1/' });
      expect(openaiAdapter.buildRequestUrl(provider)).toBe('https://api.test.com/v1/chat/completions');
    });

    it('adds query-param auth', () => {
      const provider = makeProvider({ auth: { type: 'query-param' }, apiKey: 'my-key' });
      const url = openaiAdapter.buildRequestUrl(provider);
      expect(url).toBe('https://api.test.com/v1/chat/completions?key=my-key');
    });

    it('uses & separator when URL already has query params', () => {
      const provider = makeProvider({
        auth: { type: 'query-param' },
        apiKey: 'my-key',
        endpoints: { chat: '/chat/completions?version=2' },
      });
      const url = openaiAdapter.buildRequestUrl(provider);
      expect(url).toContain('&key=my-key');
    });

    it('encodes special characters in query-param key', () => {
      const provider = makeProvider({ auth: { type: 'query-param' }, apiKey: 'key with spaces&stuff' });
      const url = openaiAdapter.buildRequestUrl(provider);
      expect(url).toContain('key=key%20with%20spaces%26stuff');
    });

    it('skips query-param when apiKey is empty', () => {
      const provider = makeProvider({ auth: { type: 'query-param' }, apiKey: '' });
      const url = openaiAdapter.buildRequestUrl(provider);
      expect(url).toBe('https://api.test.com/v1/chat/completions');
    });
  });

  describe('parseResponse', () => {
    it('parses standard OpenAI response', () => {
      const raw = makeOpenAIResponse();
      const result = openaiAdapter.parseResponse(raw);

      expect(result).toEqual({
        id: 'chatcmpl-123',
        model: 'gpt-4',
        content: 'Hello there!',
        role: 'assistant',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
    });

    it('returns null usage when missing', () => {
      const raw = makeOpenAIResponse({ usage: undefined });
      const result = openaiAdapter.parseResponse(raw);
      expect(result.usage).toBeNull();
    });

    it('handles missing choices', () => {
      const raw = makeOpenAIResponse({ choices: undefined });
      const result = openaiAdapter.parseResponse(raw);
      expect(result.content).toBe('');
      expect(result.finishReason).toBeNull();
    });

    it('handles empty choices array', () => {
      const raw = makeOpenAIResponse({ choices: [] });
      const result = openaiAdapter.parseResponse(raw);
      expect(result.content).toBe('');
      expect(result.finishReason).toBeNull();
    });

    it('defaults id and model to empty string when missing', () => {
      const result = openaiAdapter.parseResponse({});
      expect(result.id).toBe('');
      expect(result.model).toBe('');
    });
  });

  describe('parseStreamChunk', () => {
    it('returns null for [DONE]', () => {
      expect(openaiAdapter.parseStreamChunk('[DONE]')).toBeNull();
    });

    it('parses valid chunk with content', () => {
      const data = JSON.stringify({
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [{ delta: { content: 'Hello' }, finish_reason: null }],
      });
      const result = openaiAdapter.parseStreamChunk(data);

      expect(result).toEqual({
        content: 'Hello',
        finishReason: null,
        model: 'gpt-4',
        id: 'chatcmpl-123',
        usage: undefined,
      });
    });

    it('parses chunk with finish_reason', () => {
      const data = JSON.stringify({
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [{ delta: {}, finish_reason: 'stop' }],
      });
      const result = openaiAdapter.parseStreamChunk(data);
      expect(result?.finishReason).toBe('stop');
    });

    it('parses chunk with usage data', () => {
      const data = JSON.stringify({
        id: 'chatcmpl-123',
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
      const result = openaiAdapter.parseStreamChunk(data);
      expect(result?.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    });

    it('returns null for chunk with no choices and no usage', () => {
      const data = JSON.stringify({ id: 'chatcmpl-123' });
      expect(openaiAdapter.parseStreamChunk(data)).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(openaiAdapter.parseStreamChunk('not-json')).toBeNull();
    });

    it('returns empty content when delta.content is undefined', () => {
      const data = JSON.stringify({
        choices: [{ delta: {}, finish_reason: null }],
      });
      const result = openaiAdapter.parseStreamChunk(data);
      expect(result?.content).toBe('');
    });
  });
});
