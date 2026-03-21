import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import type { ProviderConfig } from '@/types/provider';
import { builtinProviders } from '@/providers/builtins';
import { fetchModelsForProvider } from '@/services/models-api';

interface ProviderStore {
  providers: ProviderConfig[];
  selectedProviderId: string | null;
  selectedModelId: string | null;
  loaded: boolean;

  load: () => Promise<void>;
  addProvider: (provider: Omit<ProviderConfig, 'id'>) => Promise<ProviderConfig>;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => Promise<void>;
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

  load: async () => {
    if (get().loaded) return;
    // Set loaded early to prevent concurrent calls from duplicating seeds
    set({ loaded: true });

    const providers = await db.providers.toArray();

    // Seed missing built-in providers with models fetched from API
    const needsSeed = builtinProviders.filter(
      (template) => !providers.some((p) => p.name === template.name && p.isBuiltIn),
    );

    if (needsSeed.length > 0) {
      let fetchedModels: Awaited<ReturnType<typeof fetchModelsForProvider>>[] = [];
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
        const newProvider: ProviderConfig = { ...template, id: nanoid(), apiKey: '', models };
        await db.providers.add(newProvider);
        providers.push(newProvider);
      }
    }

    const selectedProviderId = providers.length > 0 ? providers[0].id : null;
    const selectedModelId =
      selectedProviderId && providers[0].models.length > 0 ? providers[0].models[0].id : null;
    set({ providers, selectedProviderId, selectedModelId });
  },

  addProvider: async (provider) => {
    const newProvider: ProviderConfig = { ...provider, id: nanoid() };
    await db.providers.add(newProvider);
    set((state) => {
      const providers = [...state.providers, newProvider];
      const updates: Partial<ProviderStore> = { providers };
      if (!state.selectedProviderId) {
        updates.selectedProviderId = newProvider.id;
        if (newProvider.models.length > 0) {
          updates.selectedModelId = newProvider.models[0].id;
        }
      }
      return updates;
    });
    return newProvider;
  },

  updateProvider: async (id, updates) => {
    await db.providers.update(id, updates);
    set((state) => ({
      providers: state.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  deleteProvider: async (id) => {
    const provider = get().providers.find((p) => p.id === id);
    if (provider?.isBuiltIn) return;

    await db.providers.delete(id);
    set((state) => {
      const providers = state.providers.filter((p) => p.id !== id);
      const updates: Partial<ProviderStore> = { providers };
      if (state.selectedProviderId === id) {
        updates.selectedProviderId = providers.length > 0 ? providers[0].id : null;
        updates.selectedModelId =
          providers.length > 0 && providers[0].models.length > 0 ? providers[0].models[0].id : null;
      }
      return updates;
    });
  },

  selectProvider: (id) => {
    const provider = get().providers.find((p) => p.id === id);
    set({
      selectedProviderId: id,
      selectedModelId: provider?.models?.[0]?.id || null,
    });
  },

  selectModel: (id) => set({ selectedModelId: id }),

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

    const reset: ProviderConfig = { ...template, id: provider.id, apiKey: '', models };
    await db.providers.put(reset);
    set((state) => ({
      providers: state.providers.map((p) => (p.id === id ? reset : p)),
    }));
  },

  resetAllProviders: async () => {
    // Delete all built-in providers from DB
    const currentProviders = get().providers;
    for (const p of currentProviders) {
      if (p.isBuiltIn) {
        await db.providers.delete(p.id);
      }
    }

    // Re-seed from builtin templates with fresh models from API
    const newProviders: ProviderConfig[] = [];
    let fetchedModels: Awaited<ReturnType<typeof fetchModelsForProvider>>[] = [];
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
      const newProvider: ProviderConfig = { ...template, id: nanoid(), apiKey: '', models };
      await db.providers.add(newProvider);
      newProviders.push(newProvider);
    }

    // Keep non-built-in providers, replace built-ins
    const nonBuiltIn = currentProviders.filter((p) => !p.isBuiltIn);
    const providers = [...newProviders, ...nonBuiltIn];
    const selectedProviderId = providers.length > 0 ? providers[0].id : null;
    const selectedModelId =
      selectedProviderId && providers[0].models.length > 0 ? providers[0].models[0].id : null;
    set({ providers, selectedProviderId, selectedModelId });
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
