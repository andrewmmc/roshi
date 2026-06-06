import { makeProvider } from '@/__tests__/fixtures';
import {
  buildHealthCheckRequest,
  checkProviderHealth,
} from './provider-health';
import { sendRequest } from './llm-client';

vi.mock('./llm-client', () => ({
  sendRequest: vi.fn(),
  RequestError: class RequestError extends Error {
    status: number;
    durationMs: number;
    constructor(message: string, status: number, durationMs: number) {
      super(message);
      this.status = status;
      this.durationMs = durationMs;
    }
  },
}));

describe('provider-health', () => {
  it('builds a minimal non-streaming probe request', () => {
    expect(buildHealthCheckRequest('gpt-4o-mini')).toEqual({
      model: 'gpt-4o-mini',
      messages: [{ id: 'health-check', role: 'user', content: 'Hi' }],
      systemPrompt: '',
      stream: false,
      maxTokens: 1,
      temperature: 0,
    });
  });

  it('skips providers without API keys', async () => {
    const provider = makeProvider({ apiKey: '' });
    const result = await checkProviderHealth(provider);
    expect(result.status).toBe('skipped');
    expect(result.message).toContain('API key');
  });

  it('skips providers without models', async () => {
    const provider = makeProvider({ apiKey: 'sk-test', models: [] });
    const result = await checkProviderHealth(provider);
    expect(result.status).toBe('skipped');
    expect(result.message).toContain('No models');
  });

  it('returns success when the probe request succeeds', async () => {
    vi.mocked(sendRequest).mockResolvedValue({
      durationMs: 120,
      statusCode: 200,
    } as Awaited<ReturnType<typeof sendRequest>>);

    const provider = makeProvider({
      apiKey: 'sk-test',
      models: [
        {
          id: 'gpt-4o-mini',
          name: 'gpt-4o-mini',
          displayName: 'Mini',
          supportsStreaming: true,
        },
      ],
    });

    const result = await checkProviderHealth(provider);
    expect(result.status).toBe('success');
    expect(result.modelId).toBe('gpt-4o-mini');
    expect(sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        provider,
        request: buildHealthCheckRequest('gpt-4o-mini'),
      }),
    );
  });
});
