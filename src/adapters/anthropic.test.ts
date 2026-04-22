import { anthropicAdapter } from './anthropic';
import {
  makeProvider,
  makeRequest,
  makeMessage,
  makeAnthropicResponse,
} from '@/__tests__/fixtures';

describe('anthropicAdapter', () => {
  describe('buildRequestBody', () => {
    const provider = makeProvider({ type: 'anthropic' });

    it('builds basic request body with required max_tokens', () => {
      const request = makeRequest({
        model: 'claude-sonnet-4-20250514',
        stream: false,
        maxTokens: 1024,
      });
      const body = anthropicAdapter.buildRequestBody(request, provider);

      expect(body.model).toBe('claude-sonnet-4-20250514');
      expect(body.stream).toBe(false);
      expect(body.max_tokens).toBe(1024);
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    it('defaults max_tokens to 4096 when not provided', () => {
      const request = makeRequest({ maxTokens: undefined });
      const body = anthropicAdapter.buildRequestBody(request, provider);
      expect(body.max_tokens).toBe(4096);
    });

    it('sets system prompt as top-level field', () => {
      const request = makeRequest({ systemPrompt: 'You are helpful.' });
      const body = anthropicAdapter.buildRequestBody(request, provider);

      expect(body.system).toBe('You are helpful.');
      const messages = body.messages as Array<{
        role: string;
        content: string;
      }>;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
    });

    it('omits system field when systemPrompt is empty', () => {
      const request = makeRequest({ systemPrompt: '' });
      const body = anthropicAdapter.buildRequestBody(request, provider);
      expect(body.system).toBeUndefined();
    });

    it('omits system field when systemPrompt is undefined', () => {
      const request = makeRequest({ systemPrompt: undefined });
      const body = anthropicAdapter.buildRequestBody(request, provider);
      expect(body.system).toBeUndefined();
    });

    it('includes temperature when defined', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ temperature: 0.5 }),
        provider,
      );
      expect(body.temperature).toBe(0.5);
    });

    it('omits temperature when undefined', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ temperature: undefined }),
        provider,
      );
      expect(body.temperature).toBeUndefined();
    });

    it('includes top_p when defined and temperature is not', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ topP: 0.9, temperature: undefined }),
        provider,
      );
      expect(body.top_p).toBe(0.9);
      expect(body.temperature).toBeUndefined();
    });

    it('sends only temperature when both temperature and top_p are defined', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ temperature: 0.5, topP: 0.9 }),
        provider,
      );
      expect(body.temperature).toBe(0.5);
      expect(body.top_p).toBeUndefined();
    });

    it('clamps temperature to 1.0 for Anthropic', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ temperature: 1.5, topP: undefined }),
        provider,
      );
      expect(body.temperature).toBe(1);
    });

    it('does not include frequency_penalty or presence_penalty', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ frequencyPenalty: 0.5, presencePenalty: 0.5 }),
        provider,
      );
      expect(body.frequency_penalty).toBeUndefined();
      expect(body.presence_penalty).toBeUndefined();
    });

    it('includes top_k when defined and greater than 0', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ topK: 5 }),
        provider,
      );
      expect(body.top_k).toBe(5);
    });

    it('omits top_k when 0', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ topK: 0 }),
        provider,
      );
      expect(body.top_k).toBeUndefined();
    });

    it('omits top_k when undefined', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ topK: undefined }),
        provider,
      );
      expect(body.top_k).toBeUndefined();
    });

    it('includes thinking config when enabled', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({
          thinking: { enabled: true, budgetTokens: 10240 },
        }),
        provider,
      );
      expect(body.thinking).toEqual({
        type: 'enabled',
        budget_tokens: 10240,
      });
    });

    it('omits thinking when not enabled', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({
          thinking: { enabled: false, budgetTokens: 10240 },
        }),
        provider,
      );
      expect(body.thinking).toBeUndefined();
    });

    it('omits thinking when undefined', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({ thinking: undefined }),
        provider,
      );
      expect(body.thinking).toBeUndefined();
    });

    // --- Opus 4.7+ compatibility ---

    it('omits sampling params for claude-opus-4-7', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({
          model: 'claude-opus-4-7',
          temperature: 0.7,
          topP: 0.9,
          topK: 10,
        }),
        provider,
      );
      expect(body.temperature).toBeUndefined();
      expect(body.top_p).toBeUndefined();
      expect(body.top_k).toBeUndefined();
    });

    it('keeps sampling params for pre-4.7 models', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({
          model: 'claude-opus-4-6',
          temperature: 0.7,
          topP: undefined,
          topK: 10,
        }),
        provider,
      );
      expect(body.temperature).toBe(0.7);
      expect(body.top_k).toBe(10);
    });

    it('sends adaptive thinking for claude-opus-4-7', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({
          model: 'claude-opus-4-7',
          thinking: { enabled: true, budgetTokens: 10240 },
        }),
        provider,
      );
      expect(body.thinking).toEqual({ type: 'adaptive' });
      expect(body.effort).toBe('high');
    });

    it('sends extended thinking for pre-4.7 models', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({
          model: 'claude-sonnet-4-20250514',
          thinking: { enabled: true, budgetTokens: 10240 },
        }),
        provider,
      );
      expect(body.thinking).toEqual({
        type: 'enabled',
        budget_tokens: 10240,
      });
      expect(body.effort).toBeUndefined();
    });

    it('handles future opus models (e.g. claude-opus-4-8)', () => {
      const body = anthropicAdapter.buildRequestBody(
        makeRequest({
          model: 'claude-opus-4-8',
          temperature: 0.5,
          thinking: { enabled: true, budgetTokens: 5000 },
        }),
        provider,
      );
      expect(body.temperature).toBeUndefined();
      expect(body.thinking).toEqual({ type: 'adaptive' });
      expect(body.effort).toBe('high');
    });

    it('handles base64 image attachments', () => {
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
      const body = anthropicAdapter.buildRequestBody(request, provider);
      const messages = body.messages as Array<{
        role: string;
        content: unknown;
      }>;

      expect(messages[0].content).toEqual([
        { type: 'text', text: 'Describe this' },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: 'abc123',
          },
        },
      ]);
    });

    it('handles URL-based image attachments', () => {
      const request = makeRequest({
        messages: [
          makeMessage({
            content: 'What is this?',
            attachments: [
              {
                id: 'a1',
                filename: 'photo.jpg',
                mimeType: 'image/jpeg',
                data: 'https://example.com/photo.jpg',
              },
            ],
          }),
        ],
      });
      const body = anthropicAdapter.buildRequestBody(request, provider);
      const messages = body.messages as Array<{
        role: string;
        content: unknown;
      }>;

      expect(messages[0].content).toEqual([
        { type: 'text', text: 'What is this?' },
        {
          type: 'image',
          source: { type: 'url', url: 'https://example.com/photo.jpg' },
        },
      ]);
    });

    it('handles base64 document attachments', () => {
      const request = makeRequest({
        messages: [
          makeMessage({
            content: 'Read this',
            attachments: [
              {
                id: 'a1',
                filename: 'doc.pdf',
                mimeType: 'application/pdf',
                data: 'data:application/pdf;base64,pdfdata',
              },
            ],
          }),
        ],
      });
      const body = anthropicAdapter.buildRequestBody(request, provider);
      const messages = body.messages as Array<{
        role: string;
        content: unknown;
      }>;

      expect(messages[0].content).toEqual([
        { type: 'text', text: 'Read this' },
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: 'pdfdata',
          },
        },
      ]);
    });

    it('handles attachment with empty content', () => {
      const request = makeRequest({
        messages: [
          makeMessage({
            content: '',
            attachments: [
              {
                id: 'a1',
                filename: 'photo.png',
                mimeType: 'image/png',
                data: 'data:image/png;base64,abc',
              },
            ],
          }),
        ],
      });
      const body = anthropicAdapter.buildRequestBody(request, provider);
      const messages = body.messages as Array<{
        role: string;
        content: unknown[];
      }>;

      expect(messages[0].content).toEqual([
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: 'abc' },
        },
      ]);
    });
  });

  describe('buildRequestHeaders', () => {
    it('sets x-api-key and anthropic-version headers', () => {
      const provider = makeProvider({
        type: 'anthropic',
        auth: { type: 'api-key-header', headerName: 'x-api-key' },
        apiKey: 'sk-ant-123',
      });
      const headers = anthropicAdapter.buildRequestHeaders(provider);

      expect(headers['x-api-key']).toBe('sk-ant-123');
      expect(headers['anthropic-version']).toBe('2023-06-01');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('supports bearer auth', () => {
      const provider = makeProvider({
        auth: { type: 'bearer' },
        apiKey: 'sk-123',
      });
      const headers = anthropicAdapter.buildRequestHeaders(provider);
      expect(headers['Authorization']).toBe('Bearer sk-123');
    });

    it('merges custom headers', () => {
      const provider = makeProvider({
        auth: { type: 'api-key-header', headerName: 'x-api-key' },
        apiKey: 'sk-ant-123',
      });
      const headers = anthropicAdapter.buildRequestHeaders(provider, {
        'X-Custom': 'value',
      });

      expect(headers['X-Custom']).toBe('value');
      expect(headers['x-api-key']).toBe('sk-ant-123');
    });
  });

  describe('buildRequestUrl', () => {
    it('constructs URL from baseUrl and endpoint', () => {
      const provider = makeProvider({
        baseUrl: 'https://api.anthropic.com/v1',
        endpoints: { chat: '/messages' },
      });
      expect(anthropicAdapter.buildRequestUrl(provider)).toBe(
        'https://api.anthropic.com/v1/messages',
      );
    });

    it('strips trailing slash from baseUrl', () => {
      const provider = makeProvider({
        baseUrl: 'https://api.anthropic.com/v1/',
        endpoints: { chat: '/messages' },
      });
      expect(anthropicAdapter.buildRequestUrl(provider)).toBe(
        'https://api.anthropic.com/v1/messages',
      );
    });
  });

  describe('parseResponse', () => {
    it('parses standard Anthropic response', () => {
      const raw = makeAnthropicResponse();
      const result = anthropicAdapter.parseResponse(raw);

      expect(result).toEqual({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: 'Hello there!',
        role: 'assistant',
        finishReason: 'end_turn',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
    });

    it('joins multiple text blocks', () => {
      const raw = makeAnthropicResponse({
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'text', text: 'world!' },
        ],
      });
      const result = anthropicAdapter.parseResponse(raw);
      expect(result.content).toBe('Hello world!');
    });

    it('returns null usage when missing', () => {
      const raw = makeAnthropicResponse({ usage: undefined });
      const result = anthropicAdapter.parseResponse(raw);
      expect(result.usage).toBeNull();
    });

    it('handles missing content', () => {
      const raw = makeAnthropicResponse({ content: undefined });
      const result = anthropicAdapter.parseResponse(raw);
      expect(result.content).toBe('');
    });

    it('handles empty content array', () => {
      const raw = makeAnthropicResponse({ content: [] });
      const result = anthropicAdapter.parseResponse(raw);
      expect(result.content).toBe('');
    });

    it('defaults id and model to empty string when missing', () => {
      const result = anthropicAdapter.parseResponse({});
      expect(result.id).toBe('');
      expect(result.model).toBe('');
    });
  });

  describe('parseStreamChunk', () => {
    it('parses message_start event', () => {
      const data = JSON.stringify({
        type: 'message_start',
        message: {
          id: 'msg_123',
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 0 },
        },
      });
      const result = anthropicAdapter.parseStreamChunk(data);

      expect(result).toEqual({
        content: '',
        finishReason: null,
        model: 'claude-sonnet-4-20250514',
        id: 'msg_123',
        usage: { promptTokens: 10, completionTokens: 0, totalTokens: 10 },
      });
    });

    it('parses content_block_delta with text', () => {
      const data = JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Hello' },
      });
      const result = anthropicAdapter.parseStreamChunk(data);

      expect(result).toEqual({
        content: 'Hello',
        finishReason: null,
      });
    });

    it('returns empty content for thinking_delta', () => {
      const data = JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'thinking_delta', thinking: 'Let me think...' },
      });
      const result = anthropicAdapter.parseStreamChunk(data);
      expect(result).toEqual({
        content: '',
        finishReason: null,
      });
    });

    it('returns null for non-text content_block_delta', () => {
      const data = JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'input_json_delta', partial_json: '{}' },
      });
      expect(anthropicAdapter.parseStreamChunk(data)).toBeNull();
    });

    it('parses message_delta with stop_reason and usage', () => {
      const data = JSON.stringify({
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { input_tokens: 0, output_tokens: 15 },
      });
      const result = anthropicAdapter.parseStreamChunk(data);

      expect(result).toEqual({
        content: '',
        finishReason: 'end_turn',
        usage: { promptTokens: 0, completionTokens: 15, totalTokens: 15 },
      });
    });

    it('returns null for ping event', () => {
      const data = JSON.stringify({ type: 'ping' });
      expect(anthropicAdapter.parseStreamChunk(data)).toBeNull();
    });

    it('returns null for content_block_start event', () => {
      const data = JSON.stringify({
        type: 'content_block_start',
        content_block: { type: 'text', text: '' },
      });
      expect(anthropicAdapter.parseStreamChunk(data)).toBeNull();
    });

    it('returns null for content_block_stop event', () => {
      const data = JSON.stringify({ type: 'content_block_stop', index: 0 });
      expect(anthropicAdapter.parseStreamChunk(data)).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(anthropicAdapter.parseStreamChunk('not-json')).toBeNull();
    });
  });
});
