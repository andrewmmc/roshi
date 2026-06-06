import { create } from 'zustand';
import { db } from '@/db';
import { removeById, replaceById } from '@/stores/store-helpers';
import type { EvalRunRecord } from '@/types/eval';

interface EvalRunsStore {
  records: EvalRunRecord[];
  loaded: boolean;

  load: () => Promise<void>;
  save: (record: EvalRunRecord) => Promise<EvalRunRecord>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

function sortRecords(records: EvalRunRecord[]): EvalRunRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const useEvalRunsStore = create<EvalRunsStore>((set) => ({
  records: [],
  loaded: false,

  load: async () => {
    const records = await db.evalRuns.orderBy('createdAt').reverse().toArray();
    set({ records, loaded: true });
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

  clearAll: async () => {
    await db.evalRuns.clear();
    set({ records: [] });
  },
}));
