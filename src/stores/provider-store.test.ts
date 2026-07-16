import { useProviderStore } from './provider-store';
import { MAX_CUSTOM_PROVIDERS } from '@/constants/providers';
import { makeProvider, makeModel } from '@/__tests__/fixtures';

const { mockDb, mockFetchModels, mockCatalogLoad, nanoidCount } = vi.hoisted(
  () => {
    const settingsStore = new Map<string, unknown>();
    const mockDb = {
      providers: {
        toArray: vi.fn().mockResolvedValue([]),
        add: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      },
      settings: {
        get: vi.fn(async (key: string) => {
          const val = settingsStore.get(key);
          return val !== undefined ? { key, value: val } : undefined;
        }),
        put: vi.fn(async (entry: { key: string; value: unknown }) => {
          settingsStore.set(entry.key, entry.value);
        }),
        _store: settingsStore,
      },
    };
    const mockFetchModels = vi.fn().mockResolvedValue([]);
    const mockCatalogLoad = vi.fn().mockResolvedValue(undefined);
    const nanoidCount = { value: 0 };
    return { mockDb, mockFetchModels, mockCatalogLoad, nanoidCount };
  },
);

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `prov-id-${++nanoidCount.value}`),
}));

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/services/models-api', () => ({
  fetchModelsForProvider: mockFetchModels,
  clearModelsCache: vi.fn(),
}));
vi.mock('./model-catalog-store', () => ({
  useModelCatalogStore: {
    getState: () => ({ load: mockCatalogLoad }),
  },
}));

describe('provider-store', () => {
  const getState = () => useProviderStore.getState();

  // Mark the market migration as already applied for the bulk of tests so
  // pre-existing models on built-in providers are preserved. Migration-specific
  // tests clear this flag explicitly.
  const markMigrated = () => {
    mockDb.settings._store.set('model-market-migrated-v1', true);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    nanoidCount.value = 0;
    localStorage.clear();
    mockDb.settings._store.clear();
    markMigrated();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: false,
      refreshingCatalog: false,
    });
    mockFetchModels.mockResolvedValue([]);
    mockDb.providers.toArray.mockResolvedValue([]);
  });

  describe('load', () => {
    it('is idempotent — does not run when already loaded', async () => {
      useProviderStore.setState({ loaded: true });
      await getState().load();
      expect(mockDb.providers.toArray).not.toHaveBeenCalled();
    });

    it('seeds built-in providers with empty models on first load', async () => {
      await getState().load();

      expect(getState().providers).toHaveLength(4); // OpenAI + Anthropic + Gemini + OpenRouter
      expect(getState().providers[0].name).toBe('OpenAI');
      expect(getState().providers[0].isBuiltIn).toBe(true);
      for (const p of getState().providers) {
        expect(p.models).toEqual([]);
      }
      expect(mockFetchModels).not.toHaveBeenCalled();
      expect(mockDb.providers.add).toHaveBeenCalledTimes(4);
    });

    it('skips seeding for existing builtins', async () => {
      const existingProvider = makeProvider({
        id: 'existing-openai',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel()],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);

      await getState().load();

      // Anthropic + Gemini + OpenRouter should be seeded (OpenAI already exists)
      expect(mockDb.providers.add).toHaveBeenCalledTimes(3);
      expect(getState().providers).toHaveLength(4);
    });

    it('does not mark loaded when provider load fails', async () => {
      mockDb.providers.toArray.mockRejectedValueOnce(new Error('db failed'));

      await expect(getState().load()).rejects.toThrow('db failed');

      expect(getState().loaded).toBe(false);
    });

    it('restores valid selection from IndexedDB settings', async () => {
      const existingProvider = makeProvider({
        id: 'p1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);
      mockDb.settings._store.set('provider-selection', {
        providerId: 'p1',
        modelId: 'gpt-4',
      });

      await getState().load();

      expect(getState().selectedProviderId).toBe('p1');
      expect(getState().selectedModelId).toBe('gpt-4');
    });

    it('migrates stored legacy custom type to openai-compatible', async () => {
      const legacyRow = {
        ...makeProvider({
          id: 'legacy-custom',
          name: 'My API',
          isBuiltIn: false,
        }),
        type: 'custom',
      };
      mockDb.providers.toArray.mockResolvedValue([legacyRow as never]);

      await getState().load();

      expect(mockDb.providers.update).toHaveBeenCalledWith('legacy-custom', {
        type: 'openai-compatible',
      });
      const migrated = getState().providers.find(
        (p) => p.id === 'legacy-custom',
      );
      expect(migrated?.type).toBe('openai-compatible');
      expect(migrated?.protocol).toBe('openai-compatible-chat');
      expect(migrated?.endpoints.responses).toBe('/responses');
      expect(migrated?.models[0].source).toBe('manual');
    });

    it('normalizes loaded providers without protocol metadata', async () => {
      const provider = makeProvider({
        id: 'old-openai',
        name: 'OpenAI',
        protocol: undefined,
        endpoints: { chat: '/chat/completions' },
      });
      mockDb.providers.toArray.mockResolvedValue([provider]);

      await getState().load();

      const loaded = getState().providers.find((p) => p.id === 'old-openai');
      expect(loaded?.protocol).toBe('openai-chat-completions');
      expect(loaded?.endpoints.responses).toBe('/responses');
      expect(mockDb.providers.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'old-openai',
          protocol: 'openai-chat-completions',
          endpoints: expect.objectContaining({ responses: '/responses' }),
        }),
      );
    });

    it('does not rewrite already-normalized providers on load', async () => {
      const provider = makeProvider({ id: 'p1' });
      mockDb.providers.toArray.mockResolvedValue([provider]);

      await getState().load();

      expect(mockDb.providers.put).not.toHaveBeenCalled();
    });

    it('migrates selection from legacy localStorage to IndexedDB', async () => {
      const existingProvider = makeProvider({
        id: 'p1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);
      localStorage.setItem(
        'llm-tester-selection',
        JSON.stringify({ providerId: 'p1', modelId: 'gpt-4' }),
      );

      await getState().load();

      expect(getState().selectedProviderId).toBe('p1');
      expect(getState().selectedModelId).toBe('gpt-4');
      expect(localStorage.getItem('llm-tester-selection')).toBeNull();
      expect(mockDb.settings._store.get('provider-selection')).toEqual({
        providerId: 'p1',
        modelId: 'gpt-4',
      });
    });

    it('ignores invalid saved selection data', async () => {
      const existingProvider = makeProvider({
        id: 'p1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);
      // Reject only when retrieving the selection — leave the migration flag
      // lookup intact so it returns the already-migrated value.
      mockDb.settings.get.mockImplementationOnce(async (key: string) => {
        const val = mockDb.settings._store.get(key);
        return val !== undefined ? { key, value: val } : undefined;
      });
      mockDb.settings.get.mockRejectedValueOnce(new Error('db unavailable'));

      await getState().load();

      expect(getState().selectedProviderId).toBe('p1');
      expect(getState().selectedModelId).toBe('gpt-4');
    });

    it('falls back to first provider with models when saved selection is invalid', async () => {
      const provider = makeProvider({
        id: 'p1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'm1' })],
      });
      mockDb.providers.toArray.mockResolvedValue([provider]);
      mockDb.settings._store.set('provider-selection', {
        providerId: 'nonexistent',
        modelId: 'x',
      });

      await getState().load();

      expect(getState().selectedProviderId).toBe('p1');
      expect(getState().selectedModelId).toBe('m1');
    });

    it('selects no model when seeded providers are empty', async () => {
      await getState().load();

      // Built-ins are all seeded empty, so model id should be null even though
      // a provider is selected.
      expect(getState().selectedProviderId).toBeTruthy();
      expect(getState().selectedModelId).toBeNull();
    });
  });

  describe('market migration', () => {
    beforeEach(() => {
      mockDb.settings._store.delete('model-market-migrated-v1');
    });

    it('wipes existing built-in models on first load and persists the flag', async () => {
      const builtin = makeProvider({
        id: 'b1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [
          makeModel({ id: 'gpt-4' }),
          makeModel({ id: 'gpt-4o', source: 'models.dev' }),
        ],
      });
      const custom = makeProvider({
        id: 'c1',
        name: 'My API',
        isBuiltIn: false,
        models: [makeModel({ id: 'custom-1' })],
      });
      mockDb.providers.toArray.mockResolvedValue([builtin, custom]);

      await getState().load();

      expect(mockDb.providers.update).toHaveBeenCalledWith('b1', {
        models: [],
      });
      expect(mockDb.providers.update).not.toHaveBeenCalledWith('c1', {
        models: [],
      });

      const loadedBuiltin = getState().providers.find((p) => p.id === 'b1');
      const loadedCustom = getState().providers.find((p) => p.id === 'c1');
      expect(loadedBuiltin?.models).toEqual([]);
      expect(loadedCustom?.models).toHaveLength(1);

      expect(mockDb.settings._store.get('model-market-migrated-v1')).toBe(true);
    });

    it('is a no-op on subsequent loads', async () => {
      const builtin = makeProvider({
        id: 'b1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      mockDb.providers.toArray.mockResolvedValue([builtin]);

      await getState().load();

      useProviderStore.setState({ loaded: false });
      mockDb.providers.update.mockClear();

      // Reload with a stored built-in that already has empty models.
      const wiped = { ...builtin, models: [] };
      mockDb.providers.toArray.mockResolvedValue([wiped]);
      await getState().load();

      const wipingCalls = mockDb.providers.update.mock.calls.filter(
        ([id, updates]) =>
          id === 'b1' && (updates as { models?: unknown }).models !== undefined,
      );
      expect(wipingCalls).toHaveLength(0);
    });
  });

  describe('addProvider', () => {
    it('adds provider to DB and state', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'existing' })],
        selectedProviderId: 'existing',
        selectedModelId: 'gpt-4',
      });

      const result = await getState().addProvider({
        name: 'Custom',
        type: 'openai-compatible',
        baseUrl: 'https://custom.api',
        auth: { type: 'bearer' },
        apiKey: 'key',
        endpoints: { chat: '/chat' },
        models: [makeModel({ id: 'custom-model' })],
        isBuiltIn: false,
      });

      expect(result.id).toBeTruthy();
      expect(mockDb.providers.add).toHaveBeenCalledWith(result);
      expect(getState().providers).toHaveLength(2);
      // Should not change selection since one already exists
      expect(getState().selectedProviderId).toBe('existing');
    });

    it('auto-selects if no provider was selected', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [],
        selectedProviderId: null,
        selectedModelId: null,
      });

      await getState().addProvider({
        name: 'New',
        type: 'openai-compatible',
        baseUrl: 'https://new.api',
        auth: { type: 'none' },
        apiKey: '',
        endpoints: { chat: '/chat' },
        models: [makeModel({ id: 'new-model' })],
        isBuiltIn: false,
      });

      expect(getState().selectedProviderId).toBeTruthy();
      expect(getState().selectedModelId).toBe('new-model');
    });

    it('auto-selects a provider with no models', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [],
        selectedProviderId: null,
        selectedModelId: null,
      });

      const result = await getState().addProvider({
        name: 'New',
        type: 'openai-compatible',
        baseUrl: 'https://new.api',
        auth: { type: 'none' },
        apiKey: '',
        endpoints: { chat: '/chat' },
        models: [],
        isBuiltIn: false,
      });

      expect(getState().selectedProviderId).toBe(result.id);
      expect(getState().selectedModelId).toBeNull();
    });

    it(`rejects when there are already ${MAX_CUSTOM_PROVIDERS} custom providers`, async () => {
      const customs = Array.from({ length: MAX_CUSTOM_PROVIDERS }, (_, i) =>
        makeProvider({
          id: `c${i}`,
          name: `Custom ${i}`,
          isBuiltIn: false,
        }),
      );
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'b1', name: 'OpenAI', isBuiltIn: true }),
          ...customs,
        ],
        selectedProviderId: 'b1',
        selectedModelId: 'gpt-4',
      });

      await expect(
        getState().addProvider({
          name: 'One too many',
          type: 'openai-compatible',
          baseUrl: 'https://x',
          auth: { type: 'none' },
          apiKey: '',
          endpoints: { chat: '/chat' },
          models: [makeModel({ id: 'm' })],
          isBuiltIn: false,
        }),
      ).rejects.toThrow('MAX_CUSTOM_PROVIDERS');

      expect(mockDb.providers.add).not.toHaveBeenCalled();
    });
  });

  describe('updateProvider', () => {
    it('updates DB and state', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', name: 'Old' })],
      });

      await getState().updateProvider('p1', { name: 'Updated' });

      expect(mockDb.providers.update).toHaveBeenCalledWith('p1', {
        name: 'Updated',
      });
      expect(getState().providers[0].name).toBe('Updated');
    });

    it('selects the first model when the selected provider was empty', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', models: [] })],
        selectedProviderId: 'p1',
        selectedModelId: null,
      });
      const models = [makeModel({ id: 'new-model' })];

      await getState().updateProvider('p1', { models });

      expect(getState().selectedModelId).toBe('new-model');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
      expect(saved).toEqual({ providerId: 'p1', modelId: 'new-model' });
    });
  });

  describe('deleteProvider', () => {
    it('prevents deletion of built-in providers', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: true })],
      });

      await getState().deleteProvider('p1');

      expect(mockDb.providers.delete).not.toHaveBeenCalled();
      expect(getState().providers).toHaveLength(1);
    });

    it('deletes custom provider from DB and state', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'p1', isBuiltIn: false }),
          makeProvider({ id: 'p2', isBuiltIn: false }),
        ],
        selectedProviderId: 'p2',
        selectedModelId: 'gpt-4',
      });

      await getState().deleteProvider('p1');

      expect(mockDb.providers.delete).toHaveBeenCalledWith('p1');
      expect(getState().providers).toHaveLength(1);
      expect(getState().selectedProviderId).toBe('p2');
    });

    it('updates selection when deleting selected provider', async () => {
      const remaining = makeProvider({
        id: 'p2',
        models: [makeModel({ id: 'm2' })],
      });
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: false }), remaining],
        selectedProviderId: 'p1',
        selectedModelId: 'gpt-4',
      });

      await getState().deleteProvider('p1');

      expect(getState().selectedProviderId).toBe('p2');
      expect(getState().selectedModelId).toBe('m2');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
      expect(saved.providerId).toBe('p2');
      expect(saved.modelId).toBe('m2');
    });

    it('clears selection when deleting the last selected provider', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: false })],
        selectedProviderId: 'p1',
        selectedModelId: 'gpt-4',
      });

      await getState().deleteProvider('p1');

      expect(getState().selectedProviderId).toBeNull();
      expect(getState().selectedModelId).toBeNull();
      expect(mockDb.settings._store.get('provider-selection')).toEqual({
        providerId: null,
        modelId: null,
      });
    });

    it('does not persist selection when deleting an unselected provider', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'p1', isBuiltIn: false }),
          makeProvider({ id: 'p2', isBuiltIn: false }),
        ],
        selectedProviderId: 'p2',
        selectedModelId: 'gpt-4',
      });

      await getState().deleteProvider('p1');

      expect(mockDb.settings.put).not.toHaveBeenCalled();
    });
  });

  describe('selectProvider', () => {
    it('updates selection and persists to IndexedDB', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'p1', models: [makeModel({ id: 'm1' })] }),
          makeProvider({ id: 'p2', models: [makeModel({ id: 'm2' })] }),
        ],
        selectedProviderId: 'p1',
      });

      getState().selectProvider('p2');
      await vi.waitFor(() => {
        expect(mockDb.settings.put).toHaveBeenCalled();
      });

      expect(getState().selectedProviderId).toBe('p2');
      expect(getState().selectedModelId).toBe('m2');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
      expect(saved.providerId).toBe('p2');
    });
  });

  describe('selectModel', () => {
    it('updates model selection and persists', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({
            id: 'p1',
            models: [makeModel({ id: 'm1' }), makeModel({ id: 'm2' })],
          }),
        ],
        selectedProviderId: 'p1',
        selectedModelId: 'm1',
      });

      getState().selectModel('m2');
      await vi.waitFor(() => {
        expect(mockDb.settings.put).toHaveBeenCalled();
      });

      expect(getState().selectedModelId).toBe('m2');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
      expect(saved.modelId).toBe('m2');
    });
  });

  describe('resetProvider', () => {
    it('skips non-built-in providers', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: false })],
      });

      await getState().resetProvider('p1');

      expect(mockDb.providers.put).not.toHaveBeenCalled();
    });

    it('resets built-in provider back to empty models', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({
            id: 'p1',
            name: 'OpenAI',
            isBuiltIn: true,
            apiKey: 'old-key',
            models: [makeModel({ id: 'gpt-4' })],
          }),
        ],
        selectedProviderId: 'p1',
        selectedModelId: 'gpt-4',
      });

      await getState().resetProvider('p1');

      expect(mockFetchModels).not.toHaveBeenCalled();
      expect(mockDb.providers.put).toHaveBeenCalled();
      expect(getState().providers[0].apiKey).toBe('');
      expect(getState().providers[0].models).toEqual([]);
      // Selection model is cleared because the active provider was reset.
      expect(getState().selectedModelId).toBeNull();
    });

    it('skips unknown built-in templates', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'p1', name: 'Unknown', isBuiltIn: true }),
        ],
      });

      await getState().resetProvider('p1');

      expect(mockDb.providers.put).not.toHaveBeenCalled();
    });
  });

  describe('resetAllProviders', () => {
    it('removes all providers and re-seeds only empty builtins', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'old-openai', name: 'OpenAI', isBuiltIn: true }),
          makeProvider({
            id: 'old-router',
            name: 'OpenRouter',
            isBuiltIn: true,
          }),
          makeProvider({ id: 'custom', name: 'Custom', isBuiltIn: false }),
        ],
      });

      await getState().resetAllProviders();

      expect(mockDb.providers.clear).toHaveBeenCalled();
      expect(mockDb.providers.add).toHaveBeenCalledTimes(4);
      expect(mockFetchModels).not.toHaveBeenCalled();
      expect(getState().providers.some((p) => p.id === 'custom')).toBe(false);
      expect(getState().providers).toHaveLength(4);
      expect(getState().providers.every((p) => p.models.length === 0)).toBe(
        true,
      );
    });
  });

  describe('refreshModelCatalog', () => {
    it('does not mutate provider model lists', async () => {
      const providerModels = [makeModel({ id: 'gpt-4', source: 'models.dev' })];
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({
            id: 'b1',
            name: 'OpenAI',
            isBuiltIn: true,
            models: providerModels,
          }),
        ],
      });

      await getState().refreshModelCatalog();

      expect(mockCatalogLoad).toHaveBeenCalledWith(true);
      expect(mockDb.providers.update).not.toHaveBeenCalled();
      expect(getState().providers[0].models).toEqual(providerModels);
    });

    it('avoids overlapping refreshes', async () => {
      useProviderStore.setState({ refreshingCatalog: true });
      await getState().refreshModelCatalog();
      expect(mockCatalogLoad).not.toHaveBeenCalled();
    });
  });

  describe('addModelToProvider', () => {
    it('appends a model and persists to DB', async () => {
      const provider = makeProvider({
        id: 'b1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [],
      });
      useProviderStore.setState({ loaded: true, providers: [provider] });

      const newModel = makeModel({ id: 'gpt-4o', source: undefined });
      await getState().addModelToProvider('b1', newModel);

      const updated = getState().providers.find((p) => p.id === 'b1');
      expect(updated?.models).toHaveLength(1);
      expect(updated?.models[0].id).toBe('gpt-4o');
      // Source is filled in via normalization (built-in -> models.dev default).
      expect(updated?.models[0].source).toBe('models.dev');
      expect(mockDb.providers.update).toHaveBeenCalledWith('b1', {
        models: expect.arrayContaining([
          expect.objectContaining({ id: 'gpt-4o' }),
        ]),
      });
    });

    it('does nothing when the model is already added', async () => {
      const provider = makeProvider({
        id: 'b1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      useProviderStore.setState({ loaded: true, providers: [provider] });

      await getState().addModelToProvider('b1', makeModel({ id: 'gpt-4' }));

      expect(getState().providers[0].models).toHaveLength(1);
      expect(mockDb.providers.update).not.toHaveBeenCalled();
    });

    it('does nothing when the provider is missing', async () => {
      useProviderStore.setState({ loaded: true, providers: [] });
      await getState().addModelToProvider('missing', makeModel({ id: 'x' }));
      expect(mockDb.providers.update).not.toHaveBeenCalled();
    });

    it('auto-selects the model when none is selected for the provider', async () => {
      const provider = makeProvider({
        id: 'b1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [],
      });
      useProviderStore.setState({
        loaded: true,
        providers: [provider],
        selectedProviderId: 'b1',
        selectedModelId: null,
      });

      await getState().addModelToProvider('b1', makeModel({ id: 'gpt-4o' }));

      expect(getState().selectedProviderId).toBe('b1');
      expect(getState().selectedModelId).toBe('gpt-4o');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
      expect(saved).toEqual({ providerId: 'b1', modelId: 'gpt-4o' });
    });
  });

  describe('removeModelFromProvider', () => {
    it('removes a model and persists', async () => {
      const provider = makeProvider({
        id: 'b1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' }), makeModel({ id: 'gpt-4o' })],
      });
      useProviderStore.setState({ loaded: true, providers: [provider] });

      await getState().removeModelFromProvider('b1', 'gpt-4');

      expect(getState().providers[0].models.map((m) => m.id)).toEqual([
        'gpt-4o',
      ]);
      expect(mockDb.providers.update).toHaveBeenCalledWith('b1', {
        models: [expect.objectContaining({ id: 'gpt-4o' })],
      });
    });

    it('reassigns selection when removing the selected model', async () => {
      const provider = makeProvider({
        id: 'b1',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' }), makeModel({ id: 'gpt-4o' })],
      });
      useProviderStore.setState({
        loaded: true,
        providers: [provider],
        selectedProviderId: 'b1',
        selectedModelId: 'gpt-4',
      });

      await getState().removeModelFromProvider('b1', 'gpt-4');

      expect(getState().selectedModelId).toBe('gpt-4o');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
      expect(saved).toEqual({ providerId: 'b1', modelId: 'gpt-4o' });
    });

    it('clears selection when removing the only model', async () => {
      const provider = makeProvider({
        id: 'b1',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      useProviderStore.setState({
        loaded: true,
        providers: [provider],
        selectedProviderId: 'b1',
        selectedModelId: 'gpt-4',
      });

      await getState().removeModelFromProvider('b1', 'gpt-4');

      expect(getState().selectedModelId).toBeNull();
    });

    it('does nothing when the model is missing', async () => {
      const provider = makeProvider({
        id: 'b1',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      useProviderStore.setState({ loaded: true, providers: [provider] });

      await getState().removeModelFromProvider('b1', 'missing');

      expect(mockDb.providers.update).not.toHaveBeenCalled();
    });
  });

  describe('getSelectedProvider', () => {
    it('returns selected provider', () => {
      const provider = makeProvider({ id: 'p1' });
      useProviderStore.setState({
        providers: [provider],
        selectedProviderId: 'p1',
      });

      expect(getState().getSelectedProvider()).toEqual(provider);
    });

    it('returns null when none selected', () => {
      useProviderStore.setState({ selectedProviderId: null });
      expect(getState().getSelectedProvider()).toBeNull();
    });
  });

  describe('getSelectedModel', () => {
    it('returns selected model from selected provider', () => {
      const model = makeModel({ id: 'm1' });
      const provider = makeProvider({ id: 'p1', models: [model] });
      useProviderStore.setState({
        providers: [provider],
        selectedProviderId: 'p1',
        selectedModelId: 'm1',
      });

      expect(getState().getSelectedModel()).toEqual(model);
    });

    it('returns null when no model selected', () => {
      useProviderStore.setState({
        providers: [makeProvider({ id: 'p1' })],
        selectedProviderId: 'p1',
        selectedModelId: null,
      });

      expect(getState().getSelectedModel()).toBeNull();
    });
  });
});
