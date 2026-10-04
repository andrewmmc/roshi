import {
  MockHttpServer,
  createAnthropicStreamChunks,
} from '@/__tests__/mock-server';
import {
  makeProvider,
  makeRequest,
  makeAnthropicResponse,
  makeOpenAIResponse,
} from '@/__tests__/fixtures';
import { resolveModelCapabilities } from '@/models/resolver';
import { filterRequestByCapabilities } from '@/models/compatibility';
import { sendRequest } from './llm-client';
import { openaiNodeGenerator } from './codegen/openai-node';
import { openaiPythonGenerator } from './codegen/openai-python';
import { anthropicNodeGenerator } from './codegen/anthropic-node';
import { anthropicPythonGenerator } from './codegen/anthropic-python';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => false) }));

describe('current model compatibility through the request pipeline', () => {
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

  it.each([
    ['gpt-6-sol', 'OpenAI'],
    ['gpt-6-luna', 'OpenAI'],
    ['gpt-6-sol', 'Compatible'],
    ['gpt-6-luna', 'Compatible'],
  ])('allows sampling for %s without reasoning on %s', async (model, name) => {
    const provider = makeProvider({ name, baseUrl: `${server.url}/v1` });
    const path = name === 'OpenAI' ? '/v1/responses' : '/v1/chat/completions';
    server.on('POST', path, () => ({
      json:
        name === 'OpenAI'
          ? { id: 'resp', model, status: 'completed', output_text: 'Hello!' }
          : makeOpenAIResponse({ model }),
    }));
    for (const sampling of [
      { temperature: 0.4, topP: 0.8 },
      { temperature: undefined, topP: undefined },
    ]) {
      const request = makeRequest({ model, effort: 'none', ...sampling });
      const result = await sendRequest({ provider, request });
      expect(result.rawRequest.temperature).toBe(sampling.temperature);
      expect(result.rawRequest.top_p).toBe(sampling.topP);
      const node = openaiNodeGenerator.generate({ provider, request });
      const python = openaiPythonGenerator.generate({ provider, request });
      if (sampling.temperature !== undefined) {
        expect(node).toContain('temperature: 0.4');
        expect(node).toContain('top_p: 0.8');
        expect(python).toContain('temperature=0.4');
        expect(python).toContain('top_p=0.8');
      } else {
        expect(node).not.toContain('temperature:');
        expect(node).not.toContain('top_p:');
        expect(python).not.toContain('temperature=');
        expect(python).not.toContain('top_p=');
      }
    }
  });

  it.each(['claude-haiku-4-5', 'claude-haiku-4-5-20251001'])(
    'supports manual thinking with valid parameters for %s',
    async (model) => {
      const provider = makeProvider({
        type: 'anthropic',
        baseUrl: `${server.url}/v1`,
        endpoints: { chat: '/messages' },
      });
      server.on('POST', '/v1/messages', () => ({
        json: makeAnthropicResponse({ model }),
      }));
      const request = makeRequest({
        model,
        thinking: { enabled: true, budgetTokens: 1024 },
        temperature: 0.5,
        topP: 0.9,
        topK: 20,
        effort: 'max',
      });
      const result = await sendRequest({ provider, request });
      expect(result.rawRequest).toEqual({
        model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 4096,
        stream: false,
        thinking: { type: 'enabled', budget_tokens: 1024 },
      });
      const compatible = filterRequestByCapabilities(
        request,
        resolveModelCapabilities(provider, model),
      ).request;
      for (const generator of [
        anthropicNodeGenerator,
        anthropicPythonGenerator,
      ]) {
        const code = generator.generate({ provider, request: compatible });
        expect(code).toContain('budget_tokens');
        expect(code).not.toContain('temperature');
        expect(code).not.toContain('top_p');
        expect(code).not.toContain('top_k');
        expect(code).not.toContain('output_config');
      }
    },
  );

  it('rejects an invalid Haiku thinking budget before sending a request', async () => {
    await expect(
      sendRequest({
        provider: makeProvider({ type: 'anthropic', baseUrl: server.url }),
        request: makeRequest({
          model: 'claude-haiku-4-5',
          thinking: { enabled: true, budgetTokens: 10240 },
          maxTokens: undefined,
        }),
      }),
    ).rejects.toThrow(
      'Thinking budget must be a whole number of at least 1024 and less than Max Tokens (4096).',
    );
    expect(server.requests).toHaveLength(0);
  });

  it.each(['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna'])(
    'sends %s through Responses and generates matching SDK calls',
    async (model) => {
      const provider = makeProvider({
        name: 'OpenAI',
        baseUrl: `${server.url}/v1`,
        protocol: 'openai-chat-completions',
      });
      const request = makeRequest({
        model,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
        effort: 'max',
        reasoningMode: 'pro',
        verbosity: 'low',
      });
      server.on('POST', '/v1/responses', () => ({
        json: {
          id: 'resp-6',
          model,
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: 'Hello!' }],
            },
          ],
          usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
        },
      }));

      const result = await sendRequest({ provider, request });
      expect(result.rawRequest).toEqual({
        model,
        input: [{ role: 'user', content: 'Hello' }],
        stream: false,
        max_output_tokens: 4096,
        reasoning: { effort: 'max', mode: 'pro' },
        text: { verbosity: 'low' },
      });
      expect(result.response.content).toBe('Hello!');
      expect(result.response.usage?.totalTokens).toBe(8);
      expect(server.requests[0].pathname).toBe('/v1/responses');

      const compatible = filterRequestByCapabilities(
        request,
        resolveModelCapabilities(provider, model),
      ).request;
      const node = openaiNodeGenerator.generate({
        provider,
        request: compatible,
      });
      const python = openaiPythonGenerator.generate({
        provider,
        request: compatible,
      });
      for (const code of [node, python]) {
        expect(code).toContain('client.responses.create(');
        expect(code).toContain('max_output_tokens');
        expect(code).not.toContain('temperature');
        expect(code).not.toContain('top_p');
      }
      expect(node).toContain('reasoning: { effort: "max", mode: "pro" }');
      expect(python).toContain('reasoning={"effort": "max", "mode": "pro"}');
    },
  );

  it('streams GPT-6.1 Responses output and omits stale unsupported effort', async () => {
    const model = 'gpt-6.1-sol';
    server.on('POST', '/v1/responses', () => ({
      sse: [
        JSON.stringify({ type: 'response.output_text.delta', delta: 'Hello!' }),
        JSON.stringify({
          type: 'response.completed',
          response: {
            id: 'resp-stream',
            model,
            status: 'completed',
            usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 },
          },
        }),
      ],
    }));
    const result = await sendRequest({
      provider: makeProvider({ name: 'OpenAI', baseUrl: `${server.url}/v1` }),
      request: makeRequest({ model, stream: true, effort: 'none' }),
    });
    expect(result.rawRequest.reasoning).toBeUndefined();
    expect(result.response.content).toBe('Hello!');
    expect(result.response.usage?.totalTokens).toBe(8);
  });

  it('keeps compatible providers on Chat Completions with the selected effort', async () => {
    const provider = makeProvider({ baseUrl: `${server.url}/v1` });
    const request = makeRequest({ model: 'gpt-6.1-sol', effort: 'high' });
    server.on('POST', '/v1/chat/completions', () => ({
      json: makeOpenAIResponse(),
    }));
    const result = await sendRequest({ provider, request });
    expect(result.rawRequest).toMatchObject({
      max_completion_tokens: 4096,
      reasoning_effort: 'high',
    });
    expect(result.rawRequest).not.toHaveProperty('max_tokens');
    expect(result.rawRequest).not.toHaveProperty('temperature');
    expect(openaiNodeGenerator.generate({ provider, request })).toContain(
      'reasoning_effort: "high"',
    );
    expect(openaiPythonGenerator.generate({ provider, request })).toContain(
      'reasoning_effort="high"',
    );
  });

  it.each(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-1'])(
    'handles adaptive thinking and text blocks for %s',
    async (model) => {
      const provider = makeProvider({
        type: 'anthropic',
        baseUrl: `${server.url}/v1`,
        endpoints: { chat: '/messages' },
      });
      const request = makeRequest({
        model,
        temperature: 0.7,
        topP: 0.9,
        topK: 10,
        effort: 'max',
        thinking: { enabled: true, budgetTokens: 2048 },
      });
      server.on('POST', '/v1/messages', () => ({
        json: makeAnthropicResponse({
          model,
          content: [
            {
              type: 'thinking',
              thinking: 'Thinking...',
              signature: 'test-signature',
            },
            { type: 'text', text: 'Hello' },
            { type: 'text', text: '!' },
          ],
        }),
      }));
      const result = await sendRequest({ provider, request });
      expect(result.rawRequest).toEqual({
        model,
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'max' },
      });
      expect(result.response.content).toBe('Hello!');

      const node = anthropicNodeGenerator.generate({ provider, request });
      const python = anthropicPythonGenerator.generate({ provider, request });
      for (const code of [node, python]) {
        expect(code).not.toContain('budget_tokens');
        expect(code).not.toContain('temperature');
        expect(code).not.toContain('content[0].text');
      }
      expect(node).toContain('.filter((block) => block.type === "text")');
      expect(python).toContain('if block.type == "text"');
    },
  );

  it('leaves default thinking enabled while streaming Claude Opus 5.5', async () => {
    const model = 'claude-opus-5-5';
    server.on('POST', '/v1/messages', () => {
      const chunks = createAnthropicStreamChunks('Hello!', { model });
      chunks.splice(
        1,
        0,
        JSON.stringify({
          type: 'content_block_delta',
          delta: { type: 'thinking_delta', thinking: 'Thinking...' },
        }),
      );
      return { sse: chunks };
    });
    const result = await sendRequest({
      provider: makeProvider({
        type: 'anthropic',
        baseUrl: `${server.url}/v1`,
        endpoints: { chat: '/messages' },
      }),
      request: makeRequest({ model, stream: true, thinking: undefined }),
    });
    expect(result.rawRequest.thinking).toBeUndefined();
    expect(result.response.content).toBe('Hello!');
  });
});
