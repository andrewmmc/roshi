import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import type { ProviderConfig } from '@/types/provider';
import type { ProviderModel } from '@/types/provider';
import { getDefaultProtocolForProviderType } from '@/types/provider';
import { builtinProviders } from '@/providers/builtins';
import { MAX_CUSTOM_PROVIDERS } from '@/constants/providers';
import { resolveModelCapabilities } from '@/models/resolver';

const SELECTION_KEY = 'provider-selection';
const LEGACY_LS_KEY = 'llm-tester-selection';
const MARKET_MIGRATION_KEY = 'model-market-migrated-v1';
type BuiltInProviderTemplate = (typeof builtinProviders)[number];

function createBuiltInProvider(
  template: BuiltInProviderTemplate,
  id = nanoid(),
): ProviderConfig {
  return {
    ...template,
    id,
    apiKey: '',
    models: [],
  };
}

export function normalizeProviderModel(
  provider: ProviderConfig,
  model: ProviderModel,
): ProviderModel {
  return {
    ...model,
    source: model.source ?? (provider.isBuiltIn ? 'models.dev' : 'manual'),
  };
}

export function normalizeProviderConfig(
  provider: ProviderConfig,
): ProviderConfig {
  const endpoints =
    provider.type === 'openai-compatible'
      ? {
          ...provider.endpoints,
          responses: provider.endpoints.responses ?? '/responses',
        }
      : provider.endpoints;

  return {
    ...provider,
    protocol:
      provider.protocol ??
      getDefaultProtocolForProviderType(provider.type, provider.name),
    endpoints,
    models: provider.models.map((model) =>
      normalizeProviderModel(provider, model),
    ),
  };
}

function providerConfigsEqual(a: ProviderConfig, b: ProviderConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function createBuiltInProviders(
  templates: readonly BuiltInProviderTemplate[],
): ProviderConfig[] {
  return templates.map((template) => createBuiltInProvider(template));
}

function chooseValidSelection(
  providers: ProviderConfig[],
  saved: { providerId: string | null; modelId: string | null },
): { providerId: string | null; modelId: string | null } {
  const savedProvider = saved.providerId
    ? providers.find((p) => p.id === saved.providerId)
    : null;
  const savedModelValid = Boolean(
    savedProvider?.models.some((m) => m.id === saved.modelId),
  );
  if (savedProvider && savedModelValid) {
    return { providerId: savedProvider.id, modelId: saved.modelId };
  }

  // Prefer a provider that has at least one picked model.
  const providerWithModels = providers.find((p) => p.models.length > 0);
  const provider = providerWithModels ?? savedProvider ?? providers[0] ?? null;

  return {
    providerId: provider?.id ?? null,
    modelId: provider?.models[0]?.id ?? null,
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

async function hasMigratedToMarket(): Promise<boolean> {
  try {
    const setting = await db.settings.get(MARKET_MIGRATION_KEY);
    return Boolean(setting?.value);
  } catch {
    return false;
  }
}

async function markMarketMigrationComplete(): Promise<void> {
  try {
    await db.settings.put({ key: MARKET_MIGRATION_KEY, value: true });
  } catch {
    /* ignore */
  }
}

interface ProviderStore {
  providers: ProviderConfig[];
  selectedProviderId: string | null;
  selectedModelId: string | null;
  loaded: boolean;
  seeding: boolean;
  refreshingCatalog: boolean;

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
  refreshModelCatalog: () => Promise<void>;
  addModelToProvider: (
    providerId: string,
    model: ProviderModel,
  ) => Promise<void>;
  removeModelFromProvider: (
    providerId: string,
    modelId: string,
  ) => Promise<void>;

  getSelectedProvider: () => ProviderConfig | null;
  getSelectedModel: () => ProviderConfig['models'][0] | null;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  selectedProviderId: null,
  selectedModelId: null,
  loaded: false,
  seeding: false,
  refreshingCatalog: false,

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

    const normalizedProviders = providers.map((provider) => {
      const normalized = normalizeProviderConfig(provider);
      if (!providerConfigsEqual(provider, normalized)) {
        void db.providers.put(normalized);
      }
      return normalized;
    });

    // One-shot migration: clear out the legacy auto-synced model lists on
    // built-in providers so users start fresh in the new Model Market.
    const alreadyMigrated = await hasMigratedToMarket();
    if (!alreadyMigrated) {
      for (let i = 0; i < normalizedProviders.length; i++) {
        const provider = normalizedProviders[i];
        if (provider.isBuiltIn && provider.models.length > 0) {
          const wiped: ProviderConfig = { ...provider, models: [] };
          await db.providers.update(provider.id, { models: [] });
          normalizedProviders[i] = wiped;
        }
      }
      await markMarketMigrationComplete();
    }

    // Seed missing built-in providers with empty model lists.
    const needsSeed = builtinProviders.filter(
      (template) =>
        !normalizedProviders.some(
          (p) => p.name === template.name && p.isBuiltIn,
        ),
    );

    if (needsSeed.length > 0) {
      set({ seeding: true });
      try {
        const seededProviders = createBuiltInProviders(needsSeed);
        for (const newProvider of seededProviders) {
          await db.providers.add(newProvider);
          normalizedProviders.push(newProvider);
        }
      } finally {
        set({ seeding: false });
      }
    }

    const saved = await loadSelection();
    const { providerId: selectedProviderId, modelId: selectedModelId } =
      chooseValidSelection(normalizedProviders, saved);

    await saveSelection(selectedProviderId, selectedModelId);
    set({
      providers: normalizedProviders,
      selectedProviderId,
      selectedModelId,
      loaded: true,
    });
  },

  addProvider: async (provider) => {
    const customCount = get().providers.filter((p) => !p.isBuiltIn).length;
    if (customCount >= MAX_CUSTOM_PROVIDERS) {
      throw new Error('MAX_CUSTOM_PROVIDERS');
    }

    const newProvider: ProviderConfig = normalizeProviderConfig({
      ...provider,
      id: nanoid(),
    });
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

    const reset = createBuiltInProvider(template, provider.id);
    await db.providers.put(reset);
    let selectionChanged = false;
    let newProviderId: string | null = null;
    let newModelId: string | null = null;
    set((state) => {
      const providers = state.providers.map((p) => (p.id === id ? reset : p));
      const updates: Partial<ProviderStore> = { providers };
      if (state.selectedProviderId === id) {
        selectionChanged = true;
        newProviderId = reset.id;
        newModelId = null;
        updates.selectedModelId = null;
      }
      return updates;
    });
    if (selectionChanged) {
      await saveSelection(newProviderId, newModelId);
    }
  },

  resetAllProviders: async () => {
    await db.providers.clear();

    const newProviders = createBuiltInProviders(builtinProviders);
    for (const newProvider of newProviders) {
      await db.providers.add(newProvider);
    }

    const { providerId: selectedProviderId, modelId: selectedModelId } =
      chooseValidSelection(newProviders, { providerId: null, modelId: null });
    await saveSelection(selectedProviderId, selectedModelId);
    set({ providers: newProviders, selectedProviderId, selectedModelId });
  },

  refreshModelCatalog: async () => {
    if (get().refreshingCatalog) return;
    set({ refreshingCatalog: true });
    try {
      const { useModelCatalogStore } = await import('./model-catalog-store');
      await useModelCatalogStore.getState().load(true);
    } finally {
      set({ refreshingCatalog: false });
    }
  },

  addModelToProvider: async (providerId, model) => {
    const provider = get().providers.find((p) => p.id === providerId);
    if (!provider) return;
    if (provider.models.some((m) => m.id === model.id)) return;

    const normalized = normalizeProviderModel(provider, model);
    const models = [...provider.models, normalized];
    await db.providers.update(providerId, { models });

    let shouldPersistSelection = false;
    let newSelectedProviderId: string | null = null;
    let newSelectedModelId: string | null = null;
    set((state) => {
      const providers = state.providers.map((p) =>
        p.id === providerId ? { ...p, models } : p,
      );
      const updates: Partial<ProviderStore> = { providers };
      const noProviderSelected = !state.selectedProviderId;
      const sameProviderNoModel =
        state.selectedProviderId === providerId && !state.selectedModelId;
      if (noProviderSelected || sameProviderNoModel) {
        shouldPersistSelection = true;
        newSelectedProviderId = providerId;
        newSelectedModelId = normalized.id;
        updates.selectedProviderId = providerId;
        updates.selectedModelId = normalized.id;
      }
      return updates;
    });
    if (shouldPersistSelection) {
      await saveSelection(newSelectedProviderId, newSelectedModelId);
    }
  },

  removeModelFromProvider: async (providerId, modelId) => {
    const provider = get().providers.find((p) => p.id === providerId);
    if (!provider) return;
    if (!provider.models.some((m) => m.id === modelId)) return;

    const models = provider.models.filter((m) => m.id !== modelId);
    await db.providers.update(providerId, { models });

    let shouldPersistSelection = false;
    let newSelectedModelId: string | null = null;
    set((state) => {
      const providers = state.providers.map((p) =>
        p.id === providerId ? { ...p, models } : p,
      );
      const updates: Partial<ProviderStore> = { providers };
      if (
        state.selectedProviderId === providerId &&
        state.selectedModelId === modelId
      ) {
        shouldPersistSelection = true;
        newSelectedModelId = models[0]?.id ?? null;
        updates.selectedModelId = newSelectedModelId;
      }
      return updates;
    });
    if (shouldPersistSelection) {
      await saveSelection(providerId, newSelectedModelId);
    }
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

export const useSelectedModelCapabilities = () => {
  const provider = useSelectedProvider();
  const selectedModelId = useProviderStore((s) => s.selectedModelId);

  if (!provider) return null;

  return resolveModelCapabilities(
    provider,
    selectedModelId ?? provider.models[0]?.id ?? '',
  );
};
