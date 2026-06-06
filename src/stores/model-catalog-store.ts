import { create } from 'zustand';
import { toErrorMessage } from '@/lib/errors';
import type { ProviderModel } from '@/types/provider';
import {
  clearModelsCache,
  fetchModelsForProvider,
} from '@/services/models-api';
import { builtinProviders } from '@/providers/builtins';

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ModelCatalogStore {
  /** Map of built-in provider name -> available models from models.dev */
  models: Record<string, ProviderModel[]>;
  status: CatalogStatus;
  error: string | null;
  lastLoadedAt: number | null;
  load: (force?: boolean) => Promise<void>;
  getModelsForProvider: (providerName: string) => ProviderModel[];
}

export const useModelCatalogStore = create<ModelCatalogStore>((set, get) => ({
  models: {},
  status: 'idle',
  error: null,
  lastLoadedAt: null,

  load: async (force = false) => {
    const state = get();
    if (state.status === 'loading') return;
    if (!force && state.status === 'ready') return;

    if (force) {
      clearModelsCache();
    }

    set({ status: 'loading', error: null });
    try {
      const entries = await Promise.all(
        builtinProviders.map(async (template) => {
          try {
            const models = await fetchModelsForProvider(template.name);
            return [template.name, models] as const;
          } catch {
            return [template.name, [] as ProviderModel[]] as const;
          }
        }),
      );
      const models: Record<string, ProviderModel[]> = {};
      for (const [name, list] of entries) {
        models[name] = list;
      }
      set({
        models,
        status: 'ready',
        error: null,
        lastLoadedAt: Date.now(),
      });
    } catch (error) {
      set({
        status: 'error',
        error: toErrorMessage(error, 'Failed to load models'),
      });
    }
  },

  getModelsForProvider: (providerName: string) => {
    return get().models[providerName] ?? [];
  },
}));
