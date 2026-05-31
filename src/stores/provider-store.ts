import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import type { ProviderConfig } from '@/types/provider';
import { builtinProviders } from '@/providers/builtins';
import { MAX_CUSTOM_PROVIDERS } from '@/constants/providers';
import {
  fetchModelsForProvider,
  clearModelsCache,
} from '@/services/models-api';

const SELECTION_KEY = 'provider-selection';
const LEGACY_LS_KEY = 'llm-tester-selection';
type BuiltInProviderTemplate = (typeof builtinProviders)[number];

async function fetchModelsForTemplates(
  templates: readonly BuiltInProviderTemplate[],
): Promise<ProviderConfig['models'][]> {
  const results = await Promise.allSettled(
    templates.map((template) => fetchModelsForProvider(template.name)),
  );
  return results.map((result, index) =>
    result.status === 'fulfilled' ? result.value : templates[index].models,
  );
}

function createBuiltInProvider(
  template: BuiltInProviderTemplate,
  models: ProviderConfig['models'],
  id = nanoid(),
): ProviderConfig {
  return {
    ...template,
    id,
    apiKey: '',
    models,
  };
}

async function createBuiltInProviders(
  templates: readonly BuiltInProviderTemplate[],
): Promise<ProviderConfig[]> {
  const fetchedModels = await fetchModelsForTemplates(templates);
  return templates.map((template, index) =>
    createBuiltInProvider(template, fetchedModels[index]),
  );
}

function chooseValidSelection(
  providers: ProviderConfig[],
  saved: { providerId: string | null; modelId: string | null },
): { providerId: string | null; modelId: string | null } {
  const savedProvider = saved.providerId
    ? providers.find((p) => p.id === saved.providerId)
    : null;
  const provider = savedProvider ?? providers[0] ?? null;
  const savedModelValid = Boolean(
    savedProvider?.models.some((m) => m.id === saved.modelId),
  );

  return {
    providerId: provider?.id ?? null,
    modelId: savedModelValid
      ? saved.modelId
      : (provider?.models[0]?.id ?? null),
  };
}

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
  syncModels: () => Promise<void>;

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

    const providers = await db.providers.toArray();

    for (const p of providers) {
      const legacyType = p.type as string;
      if (legacyType === 'custom') {
        await db.providers.update(p.id, { type: 'openai-compatible' });
        (p as ProviderConfig).type = 'openai-compatible';
      }
    }

    // Seed missing built-in providers with models fetched from API
    const needsSeed = builtinProviders.filter(
      (template) =>
        !providers.some((p) => p.name === template.name && p.isBuiltIn),
    );

    if (needsSeed.length > 0) {
      set({ seeding: true });
      try {
        const seededProviders = await createBuiltInProviders(needsSeed);
        for (const newProvider of seededProviders) {
          await db.providers.add(newProvider);
          providers.push(newProvider);
        }
      } finally {
        set({ seeding: false });
      }
    }

    const saved = await loadSelection();
    const { providerId: selectedProviderId, modelId: selectedModelId } =
      chooseValidSelection(providers, saved);

    await saveSelection(selectedProviderId, selectedModelId);
    set({ providers, selectedProviderId, selectedModelId, loaded: true });
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
    let selectionChanged = false;
    set((state) => {
      const providers = state.providers.filter((p) => p.id !== id);
      const updates: Partial<ProviderStore> = { providers };
      if (state.selectedProviderId === id) {
        selectionChanged = true;
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
    if (selectionChanged) {
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

    const [models] = await fetchModelsForTemplates([template]);
    const reset = createBuiltInProvider(template, models, provider.id);
    await db.providers.put(reset);
    set((state) => ({
      providers: state.providers.map((p) => (p.id === id ? reset : p)),
    }));
  },

  resetAllProviders: async () => {
    // Delete all providers from DB (both built-in and custom)
    await db.providers.clear();

    const newProviders = await createBuiltInProviders(builtinProviders);
    for (const newProvider of newProviders) {
      await db.providers.add(newProvider);
    }

    const { providerId: selectedProviderId, modelId: selectedModelId } =
      chooseValidSelection(newProviders, { providerId: null, modelId: null });
    await saveSelection(selectedProviderId, selectedModelId);
    set({ providers: newProviders, selectedProviderId, selectedModelId });
  },

  syncModels: async () => {
    clearModelsCache();
    const builtins = get().providers.filter((p) => p.isBuiltIn);
    const results = await Promise.allSettled(
      builtins.map((p) => fetchModelsForProvider(p.name)),
    );
    const fetchedModelsById = new Map<string, ProviderConfig['models']>();

    for (let i = 0; i < builtins.length; i++) {
      const provider = builtins[i];
      const result = results[i];
      if (result.status !== 'fulfilled') continue;
      const models = result.value;
      fetchedModelsById.set(provider.id, models);
      await db.providers.update(provider.id, { models });
    }

    set((state) => ({
      providers: state.providers.map((p) => {
        if (!p.isBuiltIn) return p;
        const models = fetchedModelsById.get(p.id);
        return models ? { ...p, models } : p;
      }),
    }));
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
