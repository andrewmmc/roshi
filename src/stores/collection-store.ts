import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { AppError } from '@/lib/errors';
import { removeById, replaceById } from '@/stores/store-helpers';
import { useComposerStore, type ComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { headersToHistoryEntries } from '@/utils/headers';
import {
  STARTER_REQUEST_TEMPLATES,
  TEMPLATE_COLLECTION_ID,
} from '@/constants/request-templates';
import type {
  Collection,
  SavedRequest,
  SavedRequestSnapshot,
} from '@/types/history';

interface CollectionStore {
  collections: Collection[];
  savedRequests: SavedRequest[];
  loaded: boolean;

  load: () => Promise<void>;
  addCollection: (name: string) => Promise<Collection>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  saveCurrentRequest: (
    collectionId: string,
    name: string,
  ) => Promise<SavedRequest>;
  duplicateTemplate: (
    templateId: string,
    collectionId: string,
    name?: string,
  ) => Promise<SavedRequest>;
  updateSavedRequest: (id: string, name: string) => Promise<void>;
  deleteSavedRequest: (id: string) => Promise<void>;
}

function sortedCollections(collections: Collection[]): Collection[] {
  return [...collections].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

function sortedSavedRequests(savedRequests: SavedRequest[]): SavedRequest[] {
  return [...savedRequests].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

function makeSavedRequestSnapshot(
  composer: ComposerStore,
): SavedRequestSnapshot {
  return {
    messages: composer.messages,
    systemPrompt: composer.systemPrompt,
    temperature: composer.temperature,
    maxTokens: composer.maxTokens,
    topP: composer.topP,
    topK: composer.topK,
    frequencyPenalty: composer.frequencyPenalty,
    presencePenalty: composer.presencePenalty,
    stream: composer.stream,
    thinkingEnabled: composer.thinkingEnabled,
    thinkingBudgetTokens: composer.thinkingBudgetTokens,
    effort: composer.effort,
    verbosity: composer.verbosity,
    customHeaders: headersToHistoryEntries(composer.customHeaders),
  };
}

async function ensureStarterTemplatesSeeded(): Promise<void> {
  const collections = await db.collections.toArray();
  const existingCollection = collections.find(
    (collection) => collection.id === TEMPLATE_COLLECTION_ID,
  );
  const allSavedRequests = await db.savedRequests.toArray();
  const existingTemplates = allSavedRequests.filter(
    (request) => request.collectionId === TEMPLATE_COLLECTION_ID,
  );

  if (existingCollection && existingTemplates.length > 0) {
    return;
  }

  const now = new Date();
  const collection: Collection = existingCollection ?? {
    id: TEMPLATE_COLLECTION_ID,
    name: 'Starter templates',
    sortOrder: -1,
    createdAt: now,
    kind: 'templates',
  };

  const savedRequests: SavedRequest[] = STARTER_REQUEST_TEMPLATES.map(
    (template) => ({
      id: template.id,
      collectionId: TEMPLATE_COLLECTION_ID,
      name: template.name,
      providerId: '',
      providerName: 'Any provider',
      modelId: '',
      request: template.request,
      createdAt: now,
      updatedAt: now,
      isTemplate: true,
    }),
  );

  await db.transaction('rw', db.collections, db.savedRequests, async () => {
    if (!existingCollection) {
      await db.collections.add(collection);
    }
    if (existingTemplates.length === 0) {
      await db.savedRequests.bulkAdd(savedRequests);
    }
  });
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  savedRequests: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;

    await ensureStarterTemplatesSeeded();

    const [collections, savedRequests] = await Promise.all([
      db.collections.toArray(),
      db.savedRequests.toArray(),
    ]);

    set({
      collections: sortedCollections(collections),
      savedRequests: sortedSavedRequests(savedRequests),
      loaded: true,
    });
  },

  addCollection: async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError('COLLECTION_NAME_REQUIRED');

    const collection: Collection = {
      id: nanoid(),
      name: trimmedName,
      sortOrder: get().collections.length,
      createdAt: new Date(),
    };

    const prevCollections = get().collections;
    try {
      await db.collections.add(collection);
      set((state) => ({
        collections: sortedCollections([...state.collections, collection]),
      }));
      return collection;
    } catch (error) {
      set({ collections: prevCollections });
      throw error;
    }
  },

  renameCollection: async (id, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError('COLLECTION_NAME_REQUIRED');

    const prevCollections = get().collections;
    try {
      await db.collections.update(id, { name: trimmedName });
      set((state) => ({
        collections: sortedCollections(
          replaceById(state.collections, id, { name: trimmedName }),
        ),
      }));
    } catch (error) {
      set({ collections: prevCollections });
      throw error;
    }
  },

  deleteCollection: async (id) => {
    const collection = get().collections.find((item) => item.id === id);
    if (collection?.kind === 'templates') return;

    const prevCollections = get().collections;
    const prevSavedRequests = get().savedRequests;
    try {
      await db.transaction('rw', db.collections, db.savedRequests, async () => {
        await db.savedRequests.where('collectionId').equals(id).delete();
        await db.collections.delete(id);
      });

      set((state) => ({
        collections: removeById(state.collections, id),
        savedRequests: state.savedRequests.filter(
          (request) => request.collectionId !== id,
        ),
      }));
    } catch (error) {
      set({
        collections: prevCollections,
        savedRequests: prevSavedRequests,
      });
      throw error;
    }
  },

  saveCurrentRequest: async (collectionId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError('SAVED_REQUEST_NAME_REQUIRED');

    const providerStore = useProviderStore.getState();
    const provider = providerStore.getSelectedProvider();
    if (!provider) throw new AppError('PROVIDER_REQUIRED');

    const composer = useComposerStore.getState();
    const modelId =
      providerStore.selectedModelId ?? provider.models[0]?.id ?? '';
    const now = new Date();
    const savedRequest: SavedRequest = {
      id: nanoid(),
      collectionId,
      name: trimmedName,
      providerId: provider.id,
      providerName: provider.name,
      modelId,
      request: makeSavedRequestSnapshot(composer),
      createdAt: now,
      updatedAt: now,
    };

    const prevSavedRequests = get().savedRequests;
    const prevComposerContext = {
      collectionId: composer.activeCollectionId,
      savedRequestId: composer.activeSavedRequestId,
    };
    try {
      await db.savedRequests.add(savedRequest);
      useComposerStore
        .getState()
        .setSavedRequestContext(collectionId, savedRequest.id);
      set((state) => ({
        savedRequests: sortedSavedRequests([
          ...state.savedRequests,
          savedRequest,
        ]),
      }));
      return savedRequest;
    } catch (error) {
      useComposerStore
        .getState()
        .setSavedRequestContext(
          prevComposerContext.collectionId,
          prevComposerContext.savedRequestId,
        );
      set({ savedRequests: prevSavedRequests });
      throw error;
    }
  },

  duplicateTemplate: async (templateId, collectionId, name) => {
    const template = get().savedRequests.find(
      (request) => request.id === templateId && request.isTemplate,
    );
    if (!template) throw new AppError('SAVED_REQUEST_NOT_FOUND');

    const trimmedName = (name ?? `${template.name} copy`).trim();
    if (!trimmedName) throw new AppError('SAVED_REQUEST_NAME_REQUIRED');

    const providerStore = useProviderStore.getState();
    const provider = providerStore.getSelectedProvider();
    if (!provider) throw new AppError('PROVIDER_REQUIRED');

    const modelId =
      providerStore.selectedModelId ?? provider.models[0]?.id ?? '';
    const now = new Date();
    const savedRequest: SavedRequest = {
      id: nanoid(),
      collectionId,
      name: trimmedName,
      providerId: provider.id,
      providerName: provider.name,
      modelId,
      request: {
        ...template.request,
        messages: template.request.messages.map((message) => ({
          ...message,
          id: nanoid(),
        })),
      },
      createdAt: now,
      updatedAt: now,
    };

    const prevSavedRequests = get().savedRequests;
    try {
      await db.savedRequests.add(savedRequest);
      set((state) => ({
        savedRequests: sortedSavedRequests([
          ...state.savedRequests,
          savedRequest,
        ]),
      }));
      return savedRequest;
    } catch (error) {
      set({ savedRequests: prevSavedRequests });
      throw error;
    }
  },

  updateSavedRequest: async (id, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError('SAVED_REQUEST_NAME_REQUIRED');

    const existing = get().savedRequests.find((request) => request.id === id);
    if (!existing) throw new AppError('SAVED_REQUEST_NOT_FOUND');
    if (existing.isTemplate) {
      throw new AppError('SAVED_REQUEST_NOT_FOUND');
    }

    const providerStore = useProviderStore.getState();
    const provider = providerStore.getSelectedProvider();
    if (!provider) throw new AppError('PROVIDER_REQUIRED');

    const composer = useComposerStore.getState();
    const modelId =
      providerStore.selectedModelId ?? provider.models[0]?.id ?? '';
    const updates: Partial<SavedRequest> = {
      name: trimmedName,
      providerId: provider.id,
      providerName: provider.name,
      modelId,
      request: makeSavedRequestSnapshot(composer),
      updatedAt: new Date(),
    };

    const prevSavedRequests = get().savedRequests;
    const prevComposerContext = {
      collectionId: composer.activeCollectionId,
      savedRequestId: composer.activeSavedRequestId,
    };
    try {
      await db.savedRequests.update(id, updates);
      useComposerStore
        .getState()
        .setSavedRequestContext(existing.collectionId, existing.id);
      set((state) => ({
        savedRequests: sortedSavedRequests(
          replaceById(state.savedRequests, id, (request) => ({
            ...request,
            ...updates,
          })),
        ),
      }));
    } catch (error) {
      useComposerStore
        .getState()
        .setSavedRequestContext(
          prevComposerContext.collectionId,
          prevComposerContext.savedRequestId,
        );
      set({ savedRequests: prevSavedRequests });
      throw error;
    }
  },

  deleteSavedRequest: async (id) => {
    const existing = get().savedRequests.find((request) => request.id === id);
    if (existing?.isTemplate) return;

    const prevSavedRequests = get().savedRequests;
    const composer = useComposerStore.getState();
    const prevComposerContext = {
      collectionId: composer.activeCollectionId,
      savedRequestId: composer.activeSavedRequestId,
    };
    try {
      await db.savedRequests.delete(id);
      set((state) => ({
        savedRequests: removeById(state.savedRequests, id),
      }));

      if (composer.activeSavedRequestId === id) {
        composer.setSavedRequestContext(null, null);
      }
    } catch (error) {
      useComposerStore
        .getState()
        .setSavedRequestContext(
          prevComposerContext.collectionId,
          prevComposerContext.savedRequestId,
        );
      set({ savedRequests: prevSavedRequests });
      throw error;
    }
  },
}));
