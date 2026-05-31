import { openaiResponsesAdapter } from './openai-responses';
import { makeMessage, makeProvider, makeRequest } from '@/__tests__/fixtures';

describe('openaiResponsesAdapter', () => {
  const provider = makeProvider({
    protocol: 'openai-responses',
    endpoints: { chat: '/chat/completions', responses: '/responses' },
  });

  describe('buildRequestBody', () => {
    it('builds a Responses API body', () => {
      const body = openaiResponsesAdapter.buildRequestBody(
        makeRequest({
          model: 'gpt-5.5',
          systemPrompt: 'Be concise.',
          temperature: undefined,
          maxTokens: 2048,
          topP: undefined,
          stream: false,
        }),
        provider,
      );

      expect(body).toEqual({
        model: 'gpt-5.5',
        input: [{ role: 'user', content: 'Hello' }],
        stream: false,
        instructions: 'Be concise.',
        max_output_tokens: 2048,
      });
    });

    it('maps attachments to Responses content blocks', () => {
      const body = openaiResponsesAdapter.buildRequestBody(
        makeRequest({
          messages: [
            makeMessage({
              content: 'Review this',
              attachments: [
                {
                  id: 'img',
                  filename: 'image.png',
                  mimeType: 'image/png',
                  data: 'data:image/png;base64,abc',
                },
                {
                  id: 'pdf',
                  filename: 'doc.pdf',
                  mimeType: 'application/pdf',
                  data: 'data:application/pdf;base64,def',
                },
              ],
            }),
          ],
        }),
        provider,
      );

      expect(body.input).toEqual([
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'Review this' },
            { type: 'input_image', image_url: 'data:image/png;base64,abc' },
            {
              type: 'input_file',
              filename: 'doc.pdf',
              file_data: 'data:application/pdf;base64,def',
            },
          ],
        },
      ]);
    });
  });

  describe('buildRequestUrl', () => {
    it('uses the responses endpoint', () => {
      expect(openaiResponsesAdapter.buildRequestUrl(provider)).toBe(
        'https://api.test.com/v1/responses',
      );
    });

    it('falls back to /responses when no endpoint is configured', () => {
      expect(
        openaiResponsesAdapter.buildRequestUrl(
          makeProvider({ endpoints: { chat: '/chat/completions' } }),
        ),
      ).toBe('https://api.test.com/v1/responses');
    });
  });

  describe('parseResponse', () => {
    it('parses output_text shortcut and Responses usage', () => {
      const parsed = openaiResponsesAdapter.parseResponse({
        id: 'resp_123',
        model: 'gpt-5.5',
        output_text: 'Hello there',
        status: 'completed',
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
      });

      expect(parsed).toEqual({
        id: 'resp_123',
        model: 'gpt-5.5',
        content: 'Hello there',
        role: 'assistant',
        finishReason: 'completed',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      });
    });

    it('parses nested output content text', () => {
      const parsed = openaiResponsesAdapter.parseResponse({
        output: [
          {
            content: [
              { type: 'output_text', text: 'Hello ' },
              { type: 'output_text', text: 'world' },
            ],
          },
        ],
      });

      expect(parsed.content).toBe('Hello world');
    });
  });

  describe('parseStreamChunk', () => {
    it('parses output text deltas', () => {
      expect(
        openaiResponsesAdapter.parseStreamChunk(
          JSON.stringify({ type: 'response.output_text.delta', delta: 'Hi' }),
        ),
      ).toEqual({ content: 'Hi', finishReason: null });
    });

    it('parses completed events', () => {
      expect(
        openaiResponsesAdapter.parseStreamChunk(
          JSON.stringify({
            type: 'response.completed',
            response: {
              id: 'resp_123',
              model: 'gpt-5.5',
              status: 'completed',
              usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
            },
          }),
        ),
      ).toEqual({
        content: '',
        finishReason: 'completed',
        model: 'gpt-5.5',
        id: 'resp_123',
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      });
    });

    it('returns null for unsupported events and invalid JSON', () => {
      expect(
        openaiResponsesAdapter.parseStreamChunk(
          JSON.stringify({ type: 'response.created' }),
        ),
      ).toBeNull();
      expect(openaiResponsesAdapter.parseStreamChunk('not json')).toBeNull();
    });
  });
});
