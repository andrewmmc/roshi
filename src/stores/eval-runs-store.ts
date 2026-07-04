import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { AppError } from '@/lib/errors';
import { removeById, replaceById } from '@/stores/store-helpers';
import type { EvalCollection, EvalRunRecord } from '@/types/eval';

interface EvalRunsStore {
  records: EvalRunRecord[];
  collections: EvalCollection[];
  loaded: boolean;

  load: () => Promise<void>;
  save: (record: EvalRunRecord) => Promise<EvalRunRecord>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  moveRun: (id: string, collectionId: string | null) => Promise<void>;
  clearAll: () => Promise<void>;

  addCollection: (name: string) => Promise<EvalCollection>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
}

function sortRecords(records: EvalRunRecord[]): EvalRunRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function sortCollections(collections: EvalCollection[]): EvalCollection[] {
  return [...collections].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export const useEvalRunsStore = create<EvalRunsStore>((set, get) => ({
  records: [],
  collections: [],
  loaded: false,

  load: async () => {
    const [records, collections] = await Promise.all([
      db.evalRuns.orderBy('createdAt').reverse().toArray(),
      db.evalCollections.toArray(),
    ]);
    set({
      records: sortRecords(records),
      collections: sortCollections(collections),
      loaded: true,
    });
  },

  save: async (record) => {
    await db.evalRuns.put(record);
    set((state) => ({
      records: sortRecords([record, ...removeById(state.records, record.id)]),
    }));
    return record;
  },

  rename: async (id, name) => {
    const trimmed = name.trim();
    await db.evalRuns.update(id, { name: trimmed || undefined });
    set((state) => ({
      records: replaceById(state.records, id, {
        name: trimmed || undefined,
      }),
    }));
  },

  remove: async (id) => {
    await db.evalRuns.delete(id);
    set((state) => ({ records: removeById(state.records, id) }));
  },

  moveRun: async (id, collectionId) => {
    const existing = get().records.find((record) => record.id === id);
    if (!existing) throw new AppError('EVAL_RUN_NOT_FOUND');
    if ((existing.collectionId ?? null) === collectionId) return;
    if (
      collectionId !== null &&
      !get().collections.some((collection) => collection.id === collectionId)
    ) {
      throw new AppError('EVAL_COLLECTION_NOT_FOUND');
    }

    const prevRecords = get().records;
    try {
      await db.evalRuns.update(id, { collectionId: collectionId ?? undefined });
      set((state) => ({
        records: replaceById(state.records, id, {
          collectionId: collectionId ?? undefined,
        }),
      }));
    } catch (error) {
      set({ records: prevRecords });
      throw error;
    }
  },

  clearAll: async () => {
    await db.evalRuns.clear();
    set({ records: [] });
  },

  addCollection: async (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError('EVAL_COLLECTION_NAME_REQUIRED');

    const collection: EvalCollection = {
      id: nanoid(),
      name: trimmedName,
      sortOrder: get().collections.length,
      createdAt: new Date(),
    };

    const prevCollections = get().collections;
    try {
      await db.evalCollections.add(collection);
      set((state) => ({
        collections: sortCollections([...state.collections, collection]),
      }));
      return collection;
    } catch (error) {
      set({ collections: prevCollections });
      throw error;
    }
  },

  renameCollection: async (id, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError('EVAL_COLLECTION_NAME_REQUIRED');

    const prevCollections = get().collections;
    try {
      await db.evalCollections.update(id, { name: trimmedName });
      set((state) => ({
        collections: sortCollections(
          replaceById(state.collections, id, { name: trimmedName }),
        ),
      }));
    } catch (error) {
      set({ collections: prevCollections });
      throw error;
    }
  },

  deleteCollection: async (id) => {
    const prevCollections = get().collections;
    const prevRecords = get().records;
    try {
      await db.transaction('rw', db.evalCollections, db.evalRuns, async () => {
        await db.evalRuns.where('collectionId').equals(id).delete();
        await db.evalCollections.delete(id);
      });

      set((state) => ({
        collections: removeById(state.collections, id),
        records: state.records.filter((record) => record.collectionId !== id),
      }));
    } catch (error) {
      set({ collections: prevCollections, records: prevRecords });
      throw error;
    }
  },
}));
