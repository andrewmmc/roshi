import { MockHttpServer } from '@/__tests__/mock-server';
import {
  makeModel,
  makeOpenAIResponse,
  makeProvider,
  makeRequest,
} from '@/__tests__/fixtures';
import { buildCompatibleRequestFromComposer } from '@/utils/build-normalized-request';
import { createDefaultParamEnabled } from '@/types/optional-params';
import { resolveModelCapabilities } from '@/models/resolver';
import { sendRequest } from './llm-client';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => false) }));

function composerFor(effort: string, verbosity = 'medium') {
  return {
    messages: [{ role: 'user' as const, content: 'Hello' }],
    systemPrompt: '',
    temperature: 1,
    maxTokens: 1024,
    topP: 1,
    topK: 0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    paramEnabled: createDefaultParamEnabled(),
    stream: false,
    thinkingEnabled: false,
    thinkingBudgetTokens: 1024,
    effort,
    reasoningMode: 'standard',
    verbosity,
  };
}

describe('provider wire formats through the request pipeline', () => {
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

  it('sends the composer thinking level to Gemini 3 without the thinking toggle', async () => {
    const model = 'gemini-3-flash-preview';
    const provider = makeProvider({
      name: 'Google Gemini',
      type: 'google-gemini',
      protocol: 'gemini-generate-content',
      baseUrl: server.url,
      auth: { type: 'api-key-header', headerName: 'x-goog-api-key' },
      endpoints: { chat: '/v1beta/models' },
      models: [makeModel({ id: model })],
    });
    server.on('POST', `/v1beta/models/${model}:generateContent`, () => ({
      json: {
        candidates: [
          {
            content: { parts: [{ text: 'Hi!' }] },
            finishReason: 'STOP',
          },
        ],
        modelVersion: model,
      },
    }));

    const { request, warnings } = buildCompatibleRequestFromComposer({
      composer: composerFor('minimal'),
      messages: [{ role: 'user', content: 'Hello' }],
      model: provider.models[0],
      provider,
      selectedModelId: model,
    });
    const result = await sendRequest({ provider, request });

    expect(warnings).toEqual([]);
    expect(server.requests[0].body).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      generationConfig: { thinkingConfig: { thinkingLevel: 'minimal' } },
    });
    expect(result.response.content).toBe('Hi!');
  });

  it('sends GPT-5 verbosity over Chat Completions for compatible providers', async () => {
    const provider = makeProvider({ baseUrl: `${server.url}/v1` });
    server.on('POST', '/v1/chat/completions', () => ({
      json: makeOpenAIResponse({ model: 'gpt-5.5' }),
    }));

    const { request } = buildCompatibleRequestFromComposer({
      composer: composerFor('high', 'low'),
      messages: [{ role: 'user', content: 'Hello' }],
      model: makeModel({ id: 'gpt-5.5' }),
      provider,
      selectedModelId: 'gpt-5.5',
    });
    await sendRequest({ provider, request });

    expect(server.requests[0].body).toEqual({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
      reasoning_effort: 'high',
      verbosity: 'low',
    });
  });

  it('routes Responses-only OpenAI models to /responses', async () => {
    const provider = makeProvider({
      name: 'OpenAI',
      protocol: 'openai-chat-completions',
      baseUrl: `${server.url}/v1`,
    });
    server.on('POST', '/v1/responses', () => ({
      json: {
        id: 'resp_1',
        model: 'o3-pro',
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'Done.' }],
          },
        ],
      },
    }));

    const result = await sendRequest({
      provider,
      request: makeRequest({ model: 'o3-pro', effort: 'high' }),
    });

    expect(server.requests[0].pathname).toBe('/v1/responses');
    expect(server.requests[0].body).toEqual({
      model: 'o3-pro',
      input: [{ role: 'user', content: 'Hello' }],
      stream: false,
      max_output_tokens: 4096,
      reasoning: { effort: 'high' },
    });
    expect(result.response.content).toBe('Done.');
  });

  it('omits unsupported effort levels and verbosity for o-series models', async () => {
    const provider = makeProvider({ baseUrl: `${server.url}/v1` });
    server.on('POST', '/v1/chat/completions', () => ({
      json: makeOpenAIResponse({ model: 'o3' }),
    }));

    expect(resolveModelCapabilities(provider, 'o3').params.verbosity).toBe(
      undefined,
    );
    await sendRequest({
      provider,
      request: makeRequest({ model: 'o3', effort: 'xhigh', verbosity: 'low' }),
    });

    expect(server.requests[0].body).toEqual({
      model: 'o3',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
      max_completion_tokens: 4096,
    });
  });

  it('strips assistant-turn attachments before they reach Anthropic', async () => {
    const provider = makeProvider({
      type: 'anthropic',
      protocol: 'anthropic-messages',
      baseUrl: `${server.url}/v1`,
      endpoints: { chat: '/messages' },
    });
    server.on('POST', '/v1/messages', () => ({
      json: {
        id: 'msg_1',
        model: 'claude-sonnet-4-5',
        content: [{ type: 'text', text: 'Sure.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1, output_tokens: 1 },
      },
    }));

    await sendRequest({
      provider,
      request: makeRequest({
        model: 'claude-sonnet-4-5',
        temperature: undefined,
        messages: [
          { role: 'user', content: 'Draw a cat' },
          {
            role: 'assistant',
            content: 'Here it is.',
            attachments: [
              {
                id: 'a1',
                filename: 'cat.png',
                mimeType: 'image/png',
                data: 'data:image/png;base64,abc',
              },
            ],
          },
          { role: 'user', content: 'Thanks' },
        ],
      }),
    });

    expect(
      (server.requests[0].body as { messages: unknown[] }).messages,
    ).toEqual([
      { role: 'user', content: 'Draw a cat' },
      { role: 'assistant', content: 'Here it is.' },
      { role: 'user', content: 'Thanks' },
    ]);
  });
});
