import { fetchModelsFromApi, fetchModelsForProvider } from './models-api';

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
  });

  describe('fetchModelsFromApi', () => {
    it('fetches and returns models for all providers', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      }));

      const result = await fetchModelsFromApi();

      expect(result.openai).toHaveLength(2); // excludes embedding
      expect(result.anthropic).toHaveLength(1);
      expect(result.openrouter).toHaveLength(2); // only openai/ and anthropic/ prefixed
    });

    it('excludes embedding models', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      }));

      const result = await fetchModelsFromApi();
      const ids = result.openai.map((m) => m.id);
      expect(ids).not.toContain('text-embedding-ada-002');
    });

    it('sorts by release_date descending', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      }));

      const result = await fetchModelsFromApi();
      expect(result.openai[0].id).toBe('gpt-4'); // 2023-03-14
      expect(result.openai[1].id).toBe('gpt-3.5-turbo'); // 2023-01-01
    });

    it('openrouter: openai-prefixed before anthropic-prefixed', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      }));

      const result = await fetchModelsFromApi();
      expect(result.openrouter[0].id).toBe('openai/gpt-4');
      expect(result.openrouter[1].id).toBe('anthropic/claude-3');
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      await expect(fetchModelsFromApi()).rejects.toThrow('Failed to fetch models: 500');
    });

    it('returns empty arrays for missing providers', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }));

      const result = await fetchModelsFromApi();
      expect(result.openai).toEqual([]);
      expect(result.anthropic).toEqual([]);
      expect(result.openrouter).toEqual([]);
    });

    it('handles models without release_date', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          openai: {
            id: 'openai',
            name: 'OpenAI',
            models: {
              'model-a': { id: 'model-a', name: 'A', modalities: { output: ['text'] } },
              'model-b': { id: 'model-b', name: 'B', release_date: '2024-01-01', modalities: { output: ['text'] } },
            },
          },
        }),
      }));

      const result = await fetchModelsFromApi();
      // model-b has date, so comes first
      expect(result.openai[0].id).toBe('model-b');
      expect(result.openai[1].id).toBe('model-a');
    });

    it('uses id as displayName fallback', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          openai: {
            id: 'openai',
            name: 'OpenAI',
            models: {
              'no-name': { id: 'no-name', name: '', modalities: { output: ['text'] } },
            },
          },
        }),
      }));

      const result = await fetchModelsFromApi();
      expect(result.openai[0].displayName).toBe('no-name');
    });

    it('sets supportsStreaming to true', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      }));

      const result = await fetchModelsFromApi();
      expect(result.openai.every((m) => m.supportsStreaming)).toBe(true);
    });
  });

  describe('fetchModelsForProvider', () => {
    it('returns models for known provider', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      }));

      const models = await fetchModelsForProvider('openai');
      expect(models.length).toBeGreaterThan(0);
    });

    it('is case-insensitive', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      }));

      const models = await fetchModelsForProvider('OpenAI');
      expect(models.length).toBeGreaterThan(0);
    });

    it('returns empty array for unknown provider', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModels),
      }));

      const models = await fetchModelsForProvider('unknown');
      expect(models).toEqual([]);
    });
  });
});
