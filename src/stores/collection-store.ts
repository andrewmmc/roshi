import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
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
    collectionId: string,
    name: string,
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

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  savedRequests: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;

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
    if (!trimmedName) throw new Error('COLLECTION_NAME_REQUIRED');

    const collection: Collection = {
      id: nanoid(),
      name: trimmedName,
      sortOrder: get().collections.length,
      createdAt: new Date(),
    };

    await db.collections.add(collection);
    set((state) => ({
      collections: sortedCollections([...state.collections, collection]),
    }));
    return collection;
  },

  renameCollection: async (id, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('COLLECTION_NAME_REQUIRED');

    await db.collections.update(id, { name: trimmedName });
    set((state) => ({
      collections: sortedCollections(
        state.collections.map((collection) =>
          collection.id === id
            ? { ...collection, name: trimmedName }
            : collection,
        ),
      ),
    }));
  },

  deleteCollection: async (id) => {
    await db.transaction('rw', db.collections, db.savedRequests, async () => {
      await db.savedRequests.where('collectionId').equals(id).delete();
      await db.collections.delete(id);
    });

    set((state) => ({
      collections: state.collections.filter(
        (collection) => collection.id !== id,
      ),
      savedRequests: state.savedRequests.filter(
        (request) => request.collectionId !== id,
      ),
    }));
  },

  saveCurrentRequest: async (collectionId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('SAVED_REQUEST_NAME_REQUIRED');

    const providerStore = useProviderStore.getState();
    const provider = providerStore.getSelectedProvider();
    if (!provider) throw new Error('PROVIDER_REQUIRED');

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
  },

  updateSavedRequest: async (id, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('SAVED_REQUEST_NAME_REQUIRED');

    const existing = get().savedRequests.find((request) => request.id === id);
    if (!existing) throw new Error('SAVED_REQUEST_NOT_FOUND');

    const providerStore = useProviderStore.getState();
    const provider = providerStore.getSelectedProvider();
    if (!provider) throw new Error('PROVIDER_REQUIRED');

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

    await db.savedRequests.update(id, updates);
    useComposerStore
      .getState()
      .setSavedRequestContext(existing.collectionId, existing.id);
    set((state) => ({
      savedRequests: sortedSavedRequests(
        state.savedRequests.map((request) =>
          request.id === id ? { ...request, ...updates } : request,
        ),
      ),
    }));
  },

  deleteSavedRequest: async (id) => {
    await db.savedRequests.delete(id);
    set((state) => ({
      savedRequests: state.savedRequests.filter((request) => request.id !== id),
    }));

    const composer = useComposerStore.getState();
    if (composer.activeSavedRequestId === id) {
      composer.setSavedRequestContext(null, null);
    }
  },
}));
