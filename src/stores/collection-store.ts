import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { AppError } from '@/lib/errors';
import {
  createLoadGuard,
  removeById,
  replaceById,
} from '@/stores/store-helpers';

const collectionLoadGuard = createLoadGuard();
import { useComposerStore, type ComposerStore } from '@/stores/composer-store';
import { useProviderStore } from '@/stores/provider-store';
import { headersToHistoryEntries } from '@/utils/headers';
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
    collectionId: string | null,
    name: string,
  ) => Promise<SavedRequest>;
  updateSavedRequest: (id: string, name: string) => Promise<void>;
  renameSavedRequest: (id: string, name: string) => Promise<void>;
  moveSavedRequest: (id: string, collectionId: string | null) => Promise<void>;
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

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  savedRequests: [],
  loaded: false,

  load: async () =>
    collectionLoadGuard.run(
      () => get().loaded,
      async () => {
        const [collections, savedRequests] = await Promise.all([
          db.collections.toArray(),
          db.savedRequests.toArray(),
        ]);
        const visibleCollections = collections.filter(
          (collection) => collection.kind !== 'templates',
        );
        const visibleCollectionIds = new Set(
          visibleCollections.map((collection) => collection.id),
        );
        const visibleSavedRequests = savedRequests.filter(
          (request) =>
            !request.isTemplate &&
            (request.collectionId == null ||
              visibleCollectionIds.has(request.collectionId)),
        );

        set({
          collections: sortedCollections(visibleCollections),
          savedRequests: sortedSavedRequests(visibleSavedRequests),
          loaded: true,
        });
      },
    ),

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
      collectionId: collectionId ?? undefined,
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
        .setSavedRequestContext(existing.collectionId ?? null, existing.id);
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

  renameSavedRequest: async (id, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError('SAVED_REQUEST_NAME_REQUIRED');

    const existing = get().savedRequests.find((request) => request.id === id);
    if (!existing || existing.isTemplate) {
      throw new AppError('SAVED_REQUEST_NOT_FOUND');
    }

    const updates: Partial<SavedRequest> = {
      name: trimmedName,
      updatedAt: new Date(),
    };

    const prevSavedRequests = get().savedRequests;
    try {
      await db.savedRequests.update(id, updates);
      set((state) => ({
        savedRequests: sortedSavedRequests(
          replaceById(state.savedRequests, id, (request) => ({
            ...request,
            ...updates,
          })),
        ),
      }));
    } catch (error) {
      set({ savedRequests: prevSavedRequests });
      throw error;
    }
  },

  moveSavedRequest: async (id, collectionId) => {
    const existing = get().savedRequests.find((request) => request.id === id);
    if (!existing || existing.isTemplate) {
      throw new AppError('SAVED_REQUEST_NOT_FOUND');
    }
    if ((existing.collectionId ?? null) === collectionId) return;
    if (
      collectionId !== null &&
      !get().collections.some((collection) => collection.id === collectionId)
    ) {
      throw new AppError('COLLECTION_NOT_FOUND');
    }

    const updates: Partial<SavedRequest> = {
      collectionId: collectionId ?? undefined,
      updatedAt: new Date(),
    };

    const prevSavedRequests = get().savedRequests;
    const composer = useComposerStore.getState();
    try {
      await db.savedRequests.update(id, updates);
      set((state) => ({
        savedRequests: sortedSavedRequests(
          replaceById(state.savedRequests, id, (request) => ({
            ...request,
            ...updates,
          })),
        ),
      }));
      if (composer.activeSavedRequestId === id) {
        composer.setSavedRequestContext(collectionId, id);
      }
    } catch (error) {
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
