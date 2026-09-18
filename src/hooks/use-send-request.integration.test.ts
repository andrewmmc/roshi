import { renderHook, act, waitFor } from '@testing-library/react';
import { useSendRequest } from './use-send-request';
import { useComposerStore } from '@/stores/composer-store';
import { useResponseStore } from '@/stores/response-store';
import { useProviderStore } from '@/stores/provider-store';
import { useHistoryStore } from '@/stores/history-store';
import { useEnvironmentStore } from '@/stores/environment-store';
import { db } from '@/db';
import {
  createOpenAIStreamChunks,
  MockHttpServer,
} from '@/__tests__/mock-server';
import {
  makeModel,
  makeOpenAIResponse,
  makeProvider,
  makeMessage,
} from '@/__tests__/fixtures';

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(() => false),
}));

describe('useSendRequest integration (mock server)', () => {
  let server: MockHttpServer;

  const provider = makeProvider({
    id: 'integration-provider',
    baseUrl: '',
    models: [makeModel({ id: 'gpt-4' })],
  });

  beforeEach(async () => {
    vi.stubEnv('DEV', false);
    server = new MockHttpServer();
    const baseUrl = await server.listen();

    useProviderStore.setState({
      providers: [{ ...provider, baseUrl: `${baseUrl}/v1` }],
      selectedProviderId: provider.id,
      selectedModelId: 'gpt-4',
      loaded: true,
    });
    useComposerStore.setState({
      messages: [makeMessage({ id: 'msg-1', content: 'Hello integration' })],
      systemPrompt: '',
      temperature: 1,
      maxTokens: 4096,
      topP: 1,
      topK: 0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      effort: 'medium',
      verbosity: 'medium',
      stream: false,
      customHeaders: [],
      activeCollectionId: null,
      activeSavedRequestId: null,
    });
    useResponseStore.setState({
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      response: null,
      rawRequest: null,
      rawResponse: null,
      requestUrl: null,
      requestHeaders: null,
      responseHeaders: null,
      error: null,
      errorDetail: null,
      durationMs: null,
      statusCode: null,
      sentRequest: null,
      compatibilityWarnings: [],
    });
    useHistoryStore.setState({ entries: [], loaded: true });
    useEnvironmentStore.setState({
      environments: [],
      selectedEnvironmentId: null,
      loaded: true,
    });

    await db.history.clear();
  });

  afterEach(async () => {
    await act(async () => {
      await db.history.clear();
    });
    useHistoryStore.setState({ entries: [], loaded: true });
    await server.close();
    vi.unstubAllEnvs();
  });

  it('runs the full send flow against the mock server', async () => {
    server.on('POST', '/v1/chat/completions', (req) => {
      expect(req.body).toMatchObject({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello integration' }],
      });
      return {
        json: makeOpenAIResponse({
          choices: [
            {
              message: { role: 'assistant', content: 'Integration OK' },
              finish_reason: 'stop',
            },
          ],
        }),
      };
    });

    const { result } = renderHook(() => useSendRequest());

    await act(async () => {
      await result.current.send();
    });

    const responseState = useResponseStore.getState();
    expect(responseState.error).toBeNull();
    expect(responseState.response?.content).toBe('Integration OK');
    expect(responseState.statusCode).toBe(200);
    expect(responseState.isLoading).toBe(false);

    const composerState = useComposerStore.getState();
    expect(composerState.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Hello integration' }),
        expect.objectContaining({
          role: 'assistant',
          content: 'Integration OK',
        }),
        expect.objectContaining({ role: 'user', content: '' }),
      ]),
    );

    await waitFor(() => {
      expect(useHistoryStore.getState().entries).toHaveLength(1);
    });
    const historyState = useHistoryStore.getState();
    expect(historyState.entries[0].response?.content).toBe('Integration OK');
    expect(historyState.entries[0].error).toBeNull();

    const persisted = await db.history.toArray();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].statusCode).toBe(200);
  });

  it('streams response chunks through response store', async () => {
    useComposerStore.setState({ stream: true });

    server.on('POST', '/v1/chat/completions', () => ({
      sse: createOpenAIStreamChunks(['One', ' two', ' three']),
    }));

    const { result } = renderHook(() => useSendRequest());

    await act(async () => {
      await result.current.send();
    });

    const responseState = useResponseStore.getState();
    expect(responseState.response?.content).toBe('One two three');
    expect(responseState.isStreaming).toBe(false);
    await waitFor(() => {
      expect(useHistoryStore.getState().entries[0].response?.content).toBe(
        'One two three',
      );
    });
  });

  it('records provider HTTP errors in response and history stores', async () => {
    server.on('POST', '/v1/chat/completions', () => ({
      status: 401,
      json: { error: { message: 'Invalid API key' } },
    }));

    const { result } = renderHook(() => useSendRequest());

    await act(async () => {
      await result.current.send();
    });

    const responseState = useResponseStore.getState();
    expect(responseState.error).toBe('Provider returned HTTP 401');
    expect(responseState.errorDetail).toBe('Invalid API key');
    expect(responseState.statusCode).toBe(401);
    expect(responseState.response).toBeNull();

    await waitFor(() => {
      expect(useHistoryStore.getState().entries).toHaveLength(1);
    });
    const historyEntry = useHistoryStore.getState().entries[0];
    expect(historyEntry.error).toContain('Invalid API key');
    expect(historyEntry.response).toBeNull();

    expect(useComposerStore.getState().messages).toHaveLength(1);
  });

  it('fails validation without calling the mock server', async () => {
    useProviderStore.setState({
      selectedProviderId: null,
      selectedModelId: null,
    });

    const { result } = renderHook(() => useSendRequest());

    await act(async () => {
      await result.current.send();
    });

    expect(server.requests).toHaveLength(0);
    expect(useResponseStore.getState().error).toBe(
      'Please select a provider and model',
    );
    await waitFor(() => {
      expect(useHistoryStore.getState().entries).toHaveLength(0);
    });
  });

  it('fails when environment placeholders are missing', async () => {
    useComposerStore.setState({
      messages: [makeMessage({ id: 'msg-1', content: 'Call {{API_URL}}' })],
    });

    const { result } = renderHook(() => useSendRequest());

    await act(async () => {
      await result.current.send();
    });

    expect(server.requests).toHaveLength(0);
    expect(useResponseStore.getState().error).toContain(
      'Missing environment variables: API_URL',
    );
  });

  it('interpolates environment variables before sending', async () => {
    useEnvironmentStore.setState({
      environments: [
        {
          id: 'env-1',
          name: 'Dev',
          variables: [
            { id: 'v1', key: 'API_URL', value: 'https://example.com' },
          ],
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-01T00:00:00Z'),
        },
      ],
      selectedEnvironmentId: 'env-1',
      loaded: true,
    });
    useComposerStore.setState({
      messages: [makeMessage({ id: 'msg-1', content: 'Ping {{API_URL}}' })],
    });

    server.on('POST', '/v1/chat/completions', (req) => {
      expect(req.body).toMatchObject({
        messages: [{ role: 'user', content: 'Ping https://example.com' }],
      });
      return { json: makeOpenAIResponse() };
    });

    const { result } = renderHook(() => useSendRequest());

    await act(async () => {
      await result.current.send();
    });

    expect(useResponseStore.getState().response?.content).toBe('Hello there!');
  });

  it('cancels an in-flight request', async () => {
    server.on('POST', '/v1/chat/completions', () => ({
      delayMs: 2_000,
      json: makeOpenAIResponse(),
    }));

    const { result } = renderHook(() => useSendRequest());

    let sendPromise!: Promise<void>;
    await act(async () => {
      sendPromise = result.current.send();
    });

    await waitFor(() => {
      expect(useResponseStore.getState().isLoading).toBe(true);
    });

    await act(async () => {
      result.current.cancel();
      await sendPromise;
    });

    await waitFor(() => {
      expect(useResponseStore.getState().error).toBe('Request cancelled');
    });
    expect(useHistoryStore.getState().entries).toHaveLength(0);
  });
});
