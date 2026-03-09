import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import type { ProviderConfig } from '@/types/provider';
import { builtinProviders } from '@/providers/builtins';

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
  importBuiltin: (index: number, apiKey: string) => Promise<ProviderConfig>;

  getSelectedProvider: () => ProviderConfig | null;
  getSelectedModel: () => ProviderConfig['models'][0] | null;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  selectedProviderId: null,
  selectedModelId: null,
  loaded: false,

  load: async () => {
    const providers = await db.providers.toArray();
    const selectedProviderId = providers.length > 0 ? providers[0].id : null;
    const selectedModelId =
      selectedProviderId && providers[0].models.length > 0 ? providers[0].models[0].id : null;
    set({ providers, selectedProviderId, selectedModelId, loaded: true });
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

  importBuiltin: async (index, apiKey) => {
    const template = builtinProviders[index];
    if (!template) throw new Error('Invalid builtin provider index');
    return get().addProvider({ ...template, apiKey });
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
