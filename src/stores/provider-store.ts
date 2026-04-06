import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import type { ProviderConfig } from '@/types/provider';
import { builtinProviders } from '@/providers/builtins';
import { MAX_CUSTOM_PROVIDERS } from '@/constants/providers';
import { fetchModelsForProvider } from '@/services/models-api';

const SELECTION_KEY = 'provider-selection';
const LEGACY_LS_KEY = 'llm-tester-selection';

async function saveSelection(
  providerId: string | null,
  modelId: string | null,
) {
  await db.settings.put({ key: SELECTION_KEY, value: { providerId, modelId } });
}

async function loadSelection(): Promise<{
  providerId: string | null;
  modelId: string | null;
}> {
  try {
    const setting = await db.settings.get(SELECTION_KEY);
    if (setting?.value) {
      return setting.value as {
        providerId: string | null;
        modelId: string | null;
      };
    }
    // Migrate from legacy localStorage if present
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      localStorage.removeItem(LEGACY_LS_KEY);
      await db.settings.put({ key: SELECTION_KEY, value: parsed });
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { providerId: null, modelId: null };
}

interface ProviderStore {
  providers: ProviderConfig[];
  selectedProviderId: string | null;
  selectedModelId: string | null;
  loaded: boolean;
  seeding: boolean;

  load: () => Promise<void>;
  addProvider: (
    provider: Omit<ProviderConfig, 'id'>,
  ) => Promise<ProviderConfig>;
  updateProvider: (
    id: string,
    updates: Partial<ProviderConfig>,
  ) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  selectProvider: (id: string | null) => void;
  selectModel: (id: string | null) => void;
  resetProvider: (id: string) => Promise<void>;
  resetAllProviders: () => Promise<void>;

  getSelectedProvider: () => ProviderConfig | null;
  getSelectedModel: () => ProviderConfig['models'][0] | null;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  selectedProviderId: null,
  selectedModelId: null,
  loaded: false,
  seeding: false,

  load: async () => {
    if (get().loaded) return;
    // Set loaded early to prevent concurrent calls from duplicating seeds
    set({ loaded: true });

    const providers = await db.providers.toArray();

    // Seed missing built-in providers with models fetched from API
    const needsSeed = builtinProviders.filter(
      (template) =>
        !providers.some((p) => p.name === template.name && p.isBuiltIn),
    );

    if (needsSeed.length > 0) {
      set({ seeding: true });
      let fetchedModels: Awaited<ReturnType<typeof fetchModelsForProvider>>[] =
        [];
      try {
        fetchedModels = await Promise.all(
          needsSeed.map((t) => fetchModelsForProvider(t.name)),
        );
      } catch {
        // Graceful degradation: seed with empty models if API fails
        fetchedModels = needsSeed.map(() => []);
      }

      for (let i = 0; i < needsSeed.length; i++) {
        const template = needsSeed[i];
        const models = fetchedModels[i];
        const newProvider: ProviderConfig = {
          ...template,
          id: nanoid(),
          apiKey: '',
          models,
        };
        await db.providers.add(newProvider);
        providers.push(newProvider);
      }
      set({ seeding: false });
    }

    const saved = await loadSelection();
    const savedProviderValid =
      saved.providerId && providers.some((p) => p.id === saved.providerId);
    const savedProviderObj = savedProviderValid
      ? providers.find((p) => p.id === saved.providerId)
      : null;
    const savedModelValid =
      savedProviderObj &&
      saved.modelId &&
      savedProviderObj.models.some((m) => m.id === saved.modelId);

    const selectedProviderId = savedProviderValid
      ? saved.providerId
      : providers.length > 0
        ? providers[0].id
        : null;
    const fallbackProvider = providers.find((p) => p.id === selectedProviderId);
    const selectedModelId = savedModelValid
      ? saved.modelId
      : fallbackProvider?.models?.[0]?.id || null;

    await saveSelection(selectedProviderId, selectedModelId);
    set({ providers, selectedProviderId, selectedModelId });
  },

  addProvider: async (provider) => {
    const customCount = get().providers.filter((p) => !p.isBuiltIn).length;
    if (customCount >= MAX_CUSTOM_PROVIDERS) {
      throw new Error('MAX_CUSTOM_PROVIDERS');
    }

    const newProvider: ProviderConfig = { ...provider, id: nanoid() };
    await db.providers.add(newProvider);
    let shouldPersist = false;
    let newProviderId: string | null = null;
    let newModelId: string | null = null;
    set((state) => {
      const providers = [...state.providers, newProvider];
      const updates: Partial<ProviderStore> = { providers };
      if (!state.selectedProviderId) {
        newProviderId = newProvider.id;
        newModelId =
          newProvider.models.length > 0 ? newProvider.models[0].id : null;
        updates.selectedProviderId = newProviderId;
        updates.selectedModelId = newModelId;
        shouldPersist = true;
      }
      return updates;
    });
    if (shouldPersist) {
      await saveSelection(newProviderId, newModelId);
    }
    return newProvider;
  },

  updateProvider: async (id, updates) => {
    await db.providers.update(id, updates);
    set((state) => ({
      providers: state.providers.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    }));
  },

  deleteProvider: async (id) => {
    const provider = get().providers.find((p) => p.id === id);
    if (provider?.isBuiltIn) return;

    await db.providers.delete(id);
    let newProviderId: string | null = null;
    let newModelId: string | null = null;
    set((state) => {
      const providers = state.providers.filter((p) => p.id !== id);
      const updates: Partial<ProviderStore> = { providers };
      if (state.selectedProviderId === id) {
        newProviderId = providers.length > 0 ? providers[0].id : null;
        newModelId =
          providers.length > 0 && providers[0].models.length > 0
            ? providers[0].models[0].id
            : null;
        updates.selectedProviderId = newProviderId;
        updates.selectedModelId = newModelId;
      }
      return updates;
    });
    if (newProviderId !== null || newModelId !== null) {
      await saveSelection(newProviderId, newModelId);
    }
  },

  selectProvider: (id) => {
    const provider = get().providers.find((p) => p.id === id);
    const modelId = provider?.models?.[0]?.id || null;
    set({ selectedProviderId: id, selectedModelId: modelId });
    void saveSelection(id, modelId);
  },

  selectModel: (id) => {
    set({ selectedModelId: id });
    void saveSelection(get().selectedProviderId, id);
  },

  resetProvider: async (id) => {
    const provider = get().providers.find((p) => p.id === id);
    if (!provider?.isBuiltIn) return;

    const template = builtinProviders.find((b) => b.name === provider.name);
    if (!template) return;

    let models = template.models;
    try {
      models = await fetchModelsForProvider(template.name);
    } catch {
      // Keep empty models on fetch failure
    }

    const reset: ProviderConfig = {
      ...template,
      id: provider.id,
      apiKey: '',
      models,
    };
    await db.providers.put(reset);
    set((state) => ({
      providers: state.providers.map((p) => (p.id === id ? reset : p)),
    }));
  },

  resetAllProviders: async () => {
    // Delete all providers from DB (both built-in and custom)
    await db.providers.clear();

    // Re-seed from builtin templates with fresh models from API
    const newProviders: ProviderConfig[] = [];
    let fetchedModels: Awaited<ReturnType<typeof fetchModelsForProvider>>[] =
      [];
    try {
      fetchedModels = await Promise.all(
        builtinProviders.map((t) => fetchModelsForProvider(t.name)),
      );
    } catch {
      fetchedModels = builtinProviders.map(() => []);
    }

    for (let i = 0; i < builtinProviders.length; i++) {
      const template = builtinProviders[i];
      const models = fetchedModels[i];
      const newProvider: ProviderConfig = {
        ...template,
        id: nanoid(),
        apiKey: '',
        models,
      };
      await db.providers.add(newProvider);
      newProviders.push(newProvider);
    }

    const selectedProviderId =
      newProviders.length > 0 ? newProviders[0].id : null;
    const selectedModelId =
      selectedProviderId && newProviders[0].models.length > 0
        ? newProviders[0].models[0].id
        : null;
    await saveSelection(selectedProviderId, selectedModelId);
    set({ providers: newProviders, selectedProviderId, selectedModelId });
  },

  getSelectedProvider: () => {
    const { providers, selectedProviderId } = get();
    return providers.find((p) => p.id === selectedProviderId) || null;
  },

  getSelectedModel: () => {
    const provider = get().getSelectedProvider();
    const { selectedModelId } = get();
    return provider?.models.find((m) => m.id === selectedModelId) || null;
  },
}));

export const useSelectedProvider = () =>
  useProviderStore((s) => {
    const id = s.selectedProviderId;
    return id ? s.providers.find((p) => p.id === id) || null : null;
  });

export const useSelectedModel = () =>
  useProviderStore((s) => {
    const provider = s.selectedProviderId
      ? s.providers.find((p) => p.id === s.selectedProviderId)
      : null;
    return provider?.models.find((m) => m.id === s.selectedModelId) || null;
  });
