import {
  clearModelsCache,
  fetchModelsFromApi,
  fetchModelsForProvider,
} from './models-api';

const mockModels = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    models: {
      'gpt-4': {
        id: 'gpt-4',
        name: 'GPT-4',
        release_date: '2023-03-14',
        modalities: { input: ['text'], output: ['text'] },
        limit: { context: 8192, output: 4096 },
      },
      'gpt-3.5-turbo': {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        release_date: '2023-01-01',
        modalities: { input: ['text'], output: ['text'] },
      },
      'text-embedding-ada-002': {
        id: 'text-embedding-ada-002',
        name: 'Embedding',
        modalities: { input: ['text'], output: ['text'] },
      },
    },
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    models: {
      'claude-3-opus': {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        release_date: '2024-03-04',
        modalities: { input: ['text'], output: ['text'] },
      },
    },
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    models: {
      'gemini-2.5-pro': {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        release_date: '2025-06-17',
        modalities: { input: ['text', 'image'], output: ['text'] },
      },
      'gemini-2.0-flash': {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        release_date: '2025-02-05',
        modalities: { input: ['text'], output: ['text'] },
      },
      'gemini-embedding-001': {
        id: 'gemini-embedding-001',
        name: 'Gemini Embedding',
        release_date: '2025-03-07',
        modalities: { input: ['text'], output: ['text'] },
      },
      'gemini-old': {
        id: 'gemini-old',
        name: 'Old Gemini',
        status: 'deprecated',
        modalities: { input: ['text'], output: ['text'] },
      },
      'gemini-image-only': {
        id: 'gemini-image-only',
        name: 'Gemini Image Only',
        modalities: { input: ['text'], output: ['image'] },
      },
    },
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    models: {
      'openai/gpt-4': {
        id: 'openai/gpt-4',
        name: 'GPT-4 via OR',
        release_date: '2023-03-14',
        modalities: { input: ['text'], output: ['text'] },
      },
      'anthropic/claude-3': {
        id: 'anthropic/claude-3',
        name: 'Claude 3 via OR',
        release_date: '2024-03-04',
        modalities: { input: ['text'], output: ['text'] },
      },
      'meta/llama-3': {
        id: 'meta/llama-3',
        name: 'Llama 3 via OR',
        release_date: '2024-04-18',
        modalities: { input: ['text'], output: ['text'] },
      },
    },
  },
};

describe('models-api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    clearModelsCache();
  });

  describe('fetchModelsFromApi', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fetches and returns models for all providers', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const result = await fetchModelsFromApi();

      expect(result.openai).toHaveLength(2); // excludes embedding
      expect(result.anthropic).toHaveLength(1);
      expect(result.google).toHaveLength(2); // excludes embedding, deprecated, and non-text-output models
      expect(result.openrouter).toHaveLength(5); // hardcoded (auto, free) + all chat models
    });

    it('excludes embedding models', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const result = await fetchModelsFromApi();
      const ids = result.openai.map((m) => m.id);
      expect(ids).not.toContain('text-embedding-ada-002');
    });

    it('excludes Gemini embedding, deprecated, and non-text-output models', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const result = await fetchModelsFromApi();
      const ids = result.google.map((m) => m.id);

      expect(ids).toEqual(['gemini-2.5-pro', 'gemini-2.0-flash']);
      expect(ids).not.toContain('gemini-embedding-001');
      expect(ids).not.toContain('gemini-old');
      expect(ids).not.toContain('gemini-image-only');
    });

    it('sorts by release_date descending', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const result = await fetchModelsFromApi();
      expect(result.openai[0].id).toBe('gpt-4'); // 2023-03-14
      expect(result.openai[1].id).toBe('gpt-3.5-turbo'); // 2023-01-01
    });

    it('openrouter: hardcoded models first, then all chat models by release date', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const result = await fetchModelsFromApi();
      expect(result.openrouter.map((m) => m.id)).toEqual([
        'openrouter/auto',
        'openrouter/free',
        'meta/llama-3', // 2024-04-18
        'anthropic/claude-3', // 2024-03-04
        'openai/gpt-4', // 2023-03-14
      ]);
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      );
      await expect(fetchModelsFromApi()).rejects.toThrow(
        'Failed to fetch models: 500',
      );
    });

    it('returns empty arrays for missing providers', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      const result = await fetchModelsFromApi();
      expect(result.openai).toEqual([]);
      expect(result.anthropic).toEqual([]);
      expect(result.google).toEqual([]);
      expect(result.openrouter).toHaveLength(2); // hardcoded auto + free
      expect(result.openrouter[0].id).toBe('openrouter/auto');
      expect(result.openrouter[1].id).toBe('openrouter/free');
    });

    it('handles models without release_date', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              openai: {
                id: 'openai',
                name: 'OpenAI',
                models: {
                  'model-a': {
                    id: 'model-a',
                    name: 'A',
                    modalities: { output: ['text'] },
                  },
                  'model-b': {
                    id: 'model-b',
                    name: 'B',
                    release_date: '2024-01-01',
                    modalities: { output: ['text'] },
                  },
                },
              },
            }),
        }),
      );

      const result = await fetchModelsFromApi();
      // model-b has date, so comes first
      expect(result.openai[0].id).toBe('model-b');
      expect(result.openai[1].id).toBe('model-a');
    });

    it('uses id as displayName fallback', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              openai: {
                id: 'openai',
                name: 'OpenAI',
                models: {
                  'no-name': {
                    id: 'no-name',
                    name: '',
                    modalities: { output: ['text'] },
                  },
                },
              },
            }),
        }),
      );

      const result = await fetchModelsFromApi();
      expect(result.openai[0].displayName).toBe('no-name');
    });

    it('sets supportsStreaming to true', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const result = await fetchModelsFromApi();
      expect(result.openai.every((m) => m.supportsStreaming)).toBe(true);
    });

    it('overrides OpenAI GPT-5.5 Pro streaming support', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              openai: {
                id: 'openai',
                name: 'OpenAI',
                models: {
                  'gpt-5.5': {
                    id: 'gpt-5.5',
                    name: 'GPT-5.5',
                    modalities: { output: ['text'] },
                  },
                  'gpt-5.5-pro': {
                    id: 'gpt-5.5-pro',
                    name: 'GPT-5.5 Pro',
                    modalities: { output: ['text'] },
                  },
                },
              },
            }),
        }),
      );

      const result = await fetchModelsFromApi();

      expect(
        result.openai.find((m) => m.id === 'gpt-5.5')?.supportsStreaming,
      ).toBe(true);
      expect(
        result.openai.find((m) => m.id === 'gpt-5.5-pro')?.supportsStreaming,
      ).toBe(false);
    });

    it('maps models.dev metadata onto provider model capabilities', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const result = await fetchModelsFromApi();
      const model = result.openai.find((m) => m.id === 'gpt-4');

      expect(model).toEqual(
        expect.objectContaining({
          source: 'models.dev',
          lastSyncedAt: new Date('2026-01-02T03:04:05Z').getTime(),
          maxTokens: 4096,
          capabilities: expect.objectContaining({
            inputModalities: ['text'],
            outputModalities: ['text'],
            tokenLimits: { context: 8192, output: 4096 },
          }),
        }),
      );
    });

    it('marks OpenRouter hardcoded models as built-in overrides', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const result = await fetchModelsFromApi();

      expect(result.openrouter[0]).toEqual(
        expect.objectContaining({ source: 'builtin-override' }),
      );
      expect(result.openrouter[1]).toEqual(
        expect.objectContaining({ source: 'builtin-override' }),
      );
    });

    it('uses cached models and restores missing hardcoded OpenRouter models', async () => {
      localStorage.setItem(
        'llm-tester-models-cache',
        JSON.stringify({
          timestamp: Date.now(),
          data: {
            openai: [],
            anthropic: [],
            openrouter: [
              {
                id: 'openrouter/auto',
                name: 'openrouter/auto',
                displayName: 'Auto',
                supportsStreaming: true,
              },
            ],
          },
        }),
      );
      vi.stubGlobal('fetch', vi.fn());

      const result = await fetchModelsFromApi();

      expect(fetch).not.toHaveBeenCalled();
      expect(result.google).toEqual([]);
      expect(result.openrouter.map((m) => m.id)).toEqual([
        'openrouter/free',
        'openrouter/auto',
      ]);
    });

    it('ignores expired and invalid cache entries', async () => {
      localStorage.setItem(
        'llm-tester-models-cache',
        JSON.stringify({ timestamp: 0, data: mockModels }),
      );
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
      );

      await fetchModelsFromApi();
      expect(fetch).toHaveBeenCalledTimes(1);

      localStorage.setItem('llm-tester-models-cache', '{bad json');
      await fetchModelsFromApi();
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('ignores cache write failures', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('full');
      });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      await expect(fetchModelsFromApi()).resolves.toEqual(
        expect.objectContaining({ openai: expect.any(Array) }),
      );
    });
  });

  describe('fetchModelsForProvider', () => {
    it('returns models for known provider', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const models = await fetchModelsForProvider('openai');
      expect(models.length).toBeGreaterThan(0);
    });

    it('is case-insensitive', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const models = await fetchModelsForProvider('OpenAI');
      expect(models.length).toBeGreaterThan(0);
    });

    it('returns empty array for unknown provider', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const models = await fetchModelsForProvider('unknown');
      expect(models).toEqual([]);
    });

    it('maps the Google Gemini built-in provider to google models', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockModels),
        }),
      );

      const models = await fetchModelsForProvider('Google Gemini');
      expect(models.map((m) => m.id)).toEqual([
        'gemini-2.5-pro',
        'gemini-2.0-flash',
      ]);
    });
  });
});
